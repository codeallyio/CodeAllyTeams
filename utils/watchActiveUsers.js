const vscode = require("vscode");
const { execute } = require("apollo-link");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const { websocketLink } = require("./websocketLink");
const { watchActiveUsersSubscription } = require("./queries");
const { handleError } = require("./errorHandling");

let watchActiveUsersSubscriber = null;

let ACTIVE_USERS_DATA = {};

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

          if (
            watchActiveUsers &&
            Array.isArray(watchActiveUsers) &&
            watchActiveUsers.length > 0
          ) {
            // In user:
            // id;
            // name;
            // fullName;
            // type;

            const allUsers = [
              ...new Set([
                ...Object.keys(ACTIVE_USERS_DATA),
                ...watchActiveUsers.map((newUser) => newUser.id),
              ]),
            ];

            allUsers.map((userId) => {
              const user = watchActiveUsers.find(
                (activeUser) => activeUser.id === userId
              );

              if (user) {
                ACTIVE_USERS_DATA[userId] = watchActiveUsers.find(
                  (activeUser) => activeUser.id === userId
                );
              } else {
                delete ACTIVE_USERS_DATA[userId];
              }
            });

            vscode.commands.executeCommand("activeUsers.refresh");
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

    usersIds.map((userId) => {
      if (ACTIVE_USERS_DATA[userId]) {
        ACTIVE_USERS_DATA[userId].isSharing = true;
      }
    });

    return usersIds;
  } catch (error) {
    handleError({
      error,
      location: "watchActiveUsers -> checkOutputFiles",
    });
  }
};

const findGuest = () => {
  const guest = Object.keys(ACTIVE_USERS_DATA).find(
    (userId) => ACTIVE_USERS_DATA[userId].type === "guest"
  );

  return guest;
};

module.exports = {
  ACTIVE_USERS_DATA,
  checkOutputFiles,
  watchActiveUsersChange,
  watchActiveUsersSubscriber,
  findGuest,
};
