const { execute } = require("apollo-link");
const { websocketLink } = require("./websocketLink");
const { resetIOTaskSubscription } = require("./queries");
const { handleError } = require("./errorHandling");
const { languagesData } = require("./runIOTests");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const resetIOTaskOperation = {
  query: resetIOTaskSubscription,
  variables: {
    projectId:
      process.env.CODEALLY_ORIGINAL_PROJECT_ID || "60702e7b231de583c1e3e883",
  },
};

let startResetIOTaskSubscriber = null;
let readyToReset = true;

const watchResetIOTask = () => {
  try {
    startResetIOTaskSubscriber = execute(
      websocketLink,
      resetIOTaskOperation
    ).subscribe({
      next: async (data) => {
        try {
          const {
            data: {
              resetIOTask: { language, fileContent },
            },
          } = data;

          if (language && fileContent && readyToReset) {
            readyToReset = false;

            const fileName = languagesData[language].fileName;

            const response = await exec(
              `cd /home/codeally/project && echo '${fileContent}' > ${fileName}`
            );
            console.log(
              "🚀 ~ file: resetIOTask.js ~ line 38 ~ next: ~ response",
              response
            );
          }
        } catch (error) {
          handleError({
            error,
            location: "resetIOTask -> watchResetIOTask -> apiData",
          });
        }
      },
      error: (error) => {
        handleError({
          error,
          location: "resetIOTask -> watchResetIOTask -> subscribe",
        });
      },
      complete: () => console.log(`complete`),
    });
  } catch (error) {
    handleError({
      error,
      location: "resetIOTask -> watchResetIOTask -> catch",
    });
  }
};

module.exports = {
  watchResetIOTask,
  startResetIOTaskSubscriber,
};
