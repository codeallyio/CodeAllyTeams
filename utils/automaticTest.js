const vscode = require("vscode");
const Sentry = require("@sentry/node");
const { execute } = require("apollo-link");
const { websocketLink } = require("./websocketLink");
const { receiveTerminalSubscription } = require("./queries");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const environment = process.env.STROVE_ENVIRONMENT;
const userId = process.env.STROVE_USER_ID || "123";

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

const receiveTerminalOperation = {
  query: receiveTerminalSubscription,
  variables: {
    projectId: process.env.STROVE_PROJECT_ID || "123abc",
  },
};

let manageTerminalSubscriber = null;

const manageTerminalSharing = () => {
  // Create new terminal with test results
//   const redirectedTerminal = vscode.window.createTerminal("Test output");

//   redirectedTerminal.sendText(
//     `script -q -f /home/strove/.local/output_id_${userId}.txt`
//   );

//   redirectedTerminal.sendText("clear");

//   redirectedTerminal.show();

  // Start terminal if ping arrives
  manageTerminalSubscriber = execute(
    websocketLink,
    receiveTerminalOperation
  ).subscribe({
    next: async (data) => {
      try {
        const {
          data: { automaticTest },
        } = data;

        if (
            automaticTest &&
            automaticTest.includes("strove_receive_automatic_test_ping")
        ) {
          const [, , , , memberId, memberName] = automaticTest.split("_");

          const response = await exec(
            `touch /home/strove/.local/testOutput_id_${memberId}.txt`
          );

          const terminal = vscode.window.createTerminal(
            `${memberName}'s test output`
          );

          if (response && !response.stderr) {
            await terminal.sendText(
              `tail -q -f /home/strove/.local/testOutput_id_${memberId}.txt`
            );

            await terminal.show();
          } else {
            await terminal.sendText(
              `echo "Error happened with terminal sharing. Try again."`
            );

            await terminal.show();
          }
        }
      } catch (e) {
        console.log(
          `received error in manageTerminalSharing -> manageTerminalSubscriber -> next ${JSON.stringify(
            e
          )}`
        );

        Sentry.withScope((scope) => {
          scope.setExtras({
            data: receiveTerminalOperation,
            location:
              "manageTerminalSharing -> manageTerminalSubscriber -> next",
          });
          Sentry.captureException(e);
        });
      }
    },
    error: (error) => {
      console.log(
        `received error in manageTerminalSubscriber ${JSON.stringify(error)}`
      );

      Sentry.withScope((scope) => {
        scope.setExtras({
          data: receiveTerminalOperation,
          location: "manageTerminalSharing -> manageTerminalSubscriber",
        });
        Sentry.captureException(error);
      });
    },
    complete: () => console.log(`complete`),
  });
};

module.exports = {
  manageTerminalSharing,
  manageTerminalSubscriber,
};
