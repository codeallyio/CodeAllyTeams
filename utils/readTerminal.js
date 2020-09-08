const vscode = require("vscode");
const Sentry = require("@sentry/node");
const { execute } = require("apollo-link");

const { websocketLink } = require("./websocketLink");
const { receiveTerminalSubscription } = require("./queries");

const environment = process.env.STROVE_ENVIRONMENT;

let receiveTerminalSubscriber = null;

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

        if (receiveTerminal === "strove_receive_init_ping") {
          readTerminal = vscode.window.createTerminal("Candidate's preview");

          readTerminal.sendText("tail -q -f /home/strove/.local/output.txt");

          await readTerminal.show();
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
    console.log("error in receiveTerminal: ", e);
    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { error: e },
        location: "receiveTerminal",
      });
      Sentry.captureMessage("Unexpected error!");
    });
  }
};

module.exports = {
  readTerminal,
  receiveTerminalSubscriber,
};
