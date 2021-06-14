//   const meMock = {
//     name: "Jeff",
//     id: 4321,
//     isSharing: false,
//     watchedTerminals: [5678, 1234],
//   };
const vscode = require("vscode");
const { execute } = require("apollo-link");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const { websocketLink } = require("./websocketLink");
const { watchActiveUsersSubscription } = require("./queries");
const { handleError } = require("./errorHandling");

let watchActiveUsersSubscriber = null;

let ACTIVE_USERS_DATA = {};

// Check output files every 5 or so seconds
// isSharing = true when output-userId exists && user is active
// watchedTerminals field not necessary (?)

const watchActiveUsersChange = async () => {
  try {
    const watchActiveUsersOperation = {
      query: watchActiveUsersSubscription,
      variables: {
        projectId: process.env.CODEALLY_ORIGINAL_PROJECT_ID || "123abc",
      },
    };

    watchActiveUsersSubscriber = execute(
      websocketLink,
      watchActiveUsersOperation
    ).subscribe({
      next: async (data) => {
        try {
          const {
            data: { watchActiveUsers },
          } = data;

          if (watchActiveUsers) {
            // updateActiveUsersData
          }
        } catch (error) {
          handleError({
            error,
            location: "watchActiveUsers -> watchActiveUsersSubscriber -> next",
            additionalData: watchActiveUsersOperation,
          });
        }
      },
      error: (error) =>
        handleError({
          error,
          location: "watchActiveUsers -> watchActiveUsersSubscriber -> error",
          additionalData: watchActiveUsersOperation,
        }),
      complete: () => console.log(`complete`),
    });
  } catch (error) {
    handleError({
      error,
      location: "watchActiveUsers -> watchActiveUsersChange",
    });
  }
};

const checkOutputFiles = async () => {
  try {
    const { stdout, stderr } = await exec(`ls /home/strove/.local`);

    if (stderr) throw `error: ${stderr}`;

    const fileNames = stdout.split("\n");

    fileNames.pop();

    const usersIds = fileNames
      .filter((fileName) => fileName.includes("output"))
      .map((fileName) => fileName.match(/(?<=\-)(.*)(?=\.)/g)[0]);

    return usersIds;
  } catch (error) {
    handleError({
      error,
      location: "watchActiveUsers -> checkOutputFiles",
    });
  }
};

module.exports = {
  ACTIVE_USERS_DATA,
  checkOutputFiles,
  watchActiveUsersChange,
  watchActiveUsersSubscriber,
};
