const vscode = require("vscode");
const writeEmitter = new vscode.EventEmitter();
const Sentry = require("@sentry/node");
const { execute } = require("apollo-link");

const { websocketLink } = require("./websocketLink");
const { receiveTerminalSubscription } = require("./queries");

const environment = process.env.STROVE_ENVIRONMENT;

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

const receiveTerminal = async () => {
  try {
    const receiveTerminalOperation = {
      query: receiveTerminalSubscription,
      variables: {
        projectId: process.env.STROVE_PROJECT_ID || "123abc",
      },
    };

    const receiveTerminalSubscriber = execute(
      websocketLink,
      receiveTerminalOperation
    ).subscribe({
      next: (data) => {
        const {
          data: { receiveTerminal },
        } = data;

        writeEmitter.fire(`${receiveTerminal}\r\n\r\n`);
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

    const pty = {
      onDidWrite: writeEmitter.event,
      open: () => {
        writeEmitter.fire(
          `Welcome to strove!\n\rHere's preview of a candidate's terminal:\n\r\n\r`
        );
      },
      close: () => {
        receiveTerminalSubscriber.unsubscribe();
      },
      handleInput: async (data) => {
        // no-op
        return;
      },
    };

    const receivingTerminal = vscode.window.createTerminal({
      name: `Candidate's preview`,
      pty,
    });

    receivingTerminal.show();
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
  receiveTerminal,
};
