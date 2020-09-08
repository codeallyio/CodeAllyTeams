const vscode = require("vscode");
const Sentry = require("@sentry/node");
const { execute } = require("apollo-link");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const { websocketLink } = require("./websocketLink");
const { receiveTerminalSubscription } = require("./queries");

const environment = process.env.STROVE_ENVIRONMENT;

let receiveTerminalSubscriber = null;
let STARTING_TERMINAL = false;

Sentry.init({
  beforeSend(event) {
    // if (environment === "production") {
    return event;
    // }
    // return null;
  },
  dsn:
    "https://8acd5bf9eafc402b8666e9d55186f620@o221478.ingest.sentry.io/5285294",
  maxValueLength: 1000,
  normalizeDepth: 10,
});

const readTerminal = async () => {
  try {
    Sentry.captureMessage("Tu inny pioter, tez zignoruj");
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
        try {
          const {
            data: { receiveTerminal },
          } = data;

          if (
            receiveTerminal === "strove_receive_init_ping" &&
            !STARTING_TERMINAL
          ) {
            STARTING_TERMINAL = true;

            readTerminal = vscode.window.createTerminal("Candidate's preview");

            let whileCounter = 0;

            Sentry.captureMessage("Tu pioter, zignoruj");

            while (STARTING_TERMINAL) {
              let response;
              try {
                response = await exec(
                  `find /home/strove/.local -maxdepth 2 -name "output.txt" -print -quit`
                );
              } catch (e) {
                response = null;
                Sentry.captureMessage(`First error: ${e}`);
              }

              whileCounter++;

              await new Promise((resolve) =>
                setTimeout(() => {
                  resolve();
                }, 500)
              );

              if (response && response.stdout) {
                await readTerminal.sendText(
                  "tail -q -f /home/strove/.local/output.txt"
                );

                await readTerminal.show();

                STARTING_TERMINAL = false;
              } else if (whileCounter >= 20) {
                await readTerminal.sendText(
                  `echo "Error happened with terminal sharing. Try refreshing."`
                );

                await readTerminal.show();

                STARTING_TERMINAL = false;
              }
            }
          }
        } catch (e) {
          Sentry.captureMessage(`Second error: ${e}`);
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

module.exports = {
  readTerminal,
  receiveTerminalSubscriber,
};
