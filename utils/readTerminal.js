const vscode = require("vscode");
const Sentry = require("@sentry/node");
const { execute } = require("apollo-link");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const { websocketLink } = require("./websocketLink");
const { receiveTerminalSubscription } = require("./queries");

const environment = process.env.STROVE_ENVIRONMENT;

let receiveTerminalSubscriber = null;
let SEARCH_COUNTER = 0;
let STARTING_TERMINAL = false;

Sentry.init({
  beforeSend(event) {
    if (environment === "production") {
      return event;
    }
    return null;
  },
  dsn:
    "https://8acd5bf9eafc402b8666e9d55186f620@o221478.ingest.sentry.io/5285294",
  maxValueLength: 1000,
  normalizeDepth: 10,
});

const readTerminal = async () => {
  try {
    let readTerminal = null;

    const receiveTerminalOperation = {
      query: receiveTerminalSubscription,
      variables: {
        projectId: process.env.STROVE_PROJECT_ID || "123abc",
      },
    };

    receiveTerminalSubscriber = execute(
      websocketLink,
      receiveTerminalOperation
    ).subscribe({
      next: async (data) => {
        const {
          data: { receiveTerminal },
        } = data;

        if (
          receiveTerminal === "strove_receive_init_ping" &&
          !STARTING_TERMINAL
        ) {
          STARTING_TERMINAL = true;

          const ready = await checkFile();

          if (ready) {
            readTerminal = vscode.window.createTerminal("Candidate's preview");

            await readTerminal.sendText(
              "tail -q -f /home/strove/.local/output.txt"
            );

            // Just a test
            // await new Promise((resolve) =>
            //   setTimeout(() => {
            //     resolve();
            //   }, 1000)
            // );

            await readTerminal.show();

            STARTING_TERMINAL = false;
          }
        }
      },
      error: (error) => {
        console.log(
          `received error in receiveTerminalSubscriber ${JSON.stringify(error)}`
        );

        Sentry.withScope((scope) => {
          scope.setExtras({
            data: receiveTerminalOperation,
            location: "receiveTerminalSubscriber",
          });
          Sentry.captureException(error);
        });
      },
      complete: () => console.log(`complete`),
    });
  } catch (e) {
    console.log("error in readTerminal: ", e);
    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { error: e },
        location: "readTerminal",
      });
      Sentry.captureMessage("Unexpected error!");
    });
  }
};

// This function makes sure that there is a file to trail
// It also retires up to 10 times if something goes wrong
const checkFile = async () => {
  try {
    let fileFound = false;
    let searchFlag = true;
    let whileCounter = 0;

    while (searchFlag) {
      const response = await exec(
        `find /home/strove/.local -maxdepth 2 -name "output.txt" -print -quit`
      );

      if (response?.stdout) {
        fileFound = true;
        searchFlag = false;
      } else if (whileCounter >= 20) {
        fileFound = false;
        searchFlag = false;
      }

      whileCounter++;

      await new Promise((resolve) =>
        setTimeout(() => {
          resolve();
        }, 500)
      );
    }

    return fileFound;
  } catch (e) {
    if (SEARCH_COUNTER >= 10) return false;
    SEARCH_COUNTER++;
    console.log("error in checkFile: ", e);
    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { error: e },
        location: "readTerminal -> checkFile",
      });
      Sentry.captureMessage("Unexpected error!");
    });
    return checkFile();
  }
};

module.exports = {
  readTerminal,
  receiveTerminalSubscriber,
};
