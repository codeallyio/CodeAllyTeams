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
let TERMINAL_ACTIVE = false;

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
    let terminal = null;

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
            !STARTING_TERMINAL &&
            !TERMINAL_ACTIVE
          ) {
            STARTING_TERMINAL = true;

            terminal = vscode.window.createTerminal("Candidate's preview");

            let whileCounter = 0;

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
                await terminal.sendText(
                  "tail -q -f /home/strove/.local/output.txt"
                );

                await terminal.show();

                STARTING_TERMINAL = false;
                TERMINAL_ACTIVE = true;
              } else if (whileCounter >= 20) {
                await terminal.sendText(
                  `echo "Error happened with terminal sharing. Try refreshing."`
                );

                await terminal.show();

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
