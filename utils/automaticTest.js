const vscode = require("vscode");
const Sentry = require("@sentry/node");
const { execute } = require("apollo-link");
const { websocketLink } = require("./websocketLink");
const { receiveAutomaticTestSubscription } = require("./queries");
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
  query: receiveAutomaticTestSubscription,
  variables: {
    projectId: process.env.STROVE_PROJECT_ID || "123abc",
  },
};

let autoTestTerminalSubscriber = null;

const startAutomaticTest = () => {
  // Create new terminal with test results
  //   const redirectedTerminal = vscode.window.createTerminal("Test output");

  //   redirectedTerminal.sendText(
  //     `script -q -f /home/strove/.local/output_id_${userId}.txt`
  //   );

  //   redirectedTerminal.sendText("clear");

  //   redirectedTerminal.show();

  // Start terminal if ping arrives
  autoTestTerminalSubscriber = execute(
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
          automaticTest.command.includes("strove_receive_automatic_test_ping")
        ) {
          const terminal = vscode.window.createTerminal("Test output");

          // Send test command start to the terminal
          const response = terminal.sendText(`${testStartCommand}`);

          terminal.show();

          // Create Output file
          //   const response = await exec(
          //     `touch /home/strove/.local/testOutput_id_${memberId}.txt`
          //   );

          //   if (response && !response.stderr) {
          //     await terminal.sendText(
          //       `tail -q -f /home/strove/.local/testOutput_id_${memberId}.txt`
          //     );

          //     await terminal.show();
          //   } else {
          //     await terminal.sendText(
          //       `echo "Error happened with terminal. Try again."`
          //     );

          //     await terminal.show();
          //   }
        }
      } catch (e) {
        console.log(
          `received error in startAutomaticTest -> autoTestTerminalSubscriber -> next ${JSON.stringify(
            e
          )}`
        );

        Sentry.withScope((scope) => {
          scope.setExtras({
            data: receiveTerminalOperation,
            location:
              "startAutomaticTest -> autoTestTerminalSubscriber -> next",
          });
          Sentry.captureException(e);
        });
      }
    },
    error: (error) => {
      console.log(
        `received error in autoTestTerminalSubscriber ${JSON.stringify(error)}`
      );

      Sentry.withScope((scope) => {
        scope.setExtras({
          data: receiveTerminalOperation,
          location: "startAutomaticTest -> autoTestTerminalSubscriber",
        });
        Sentry.captureException(error);
      });
    },
    complete: () => console.log(`complete`),
  });
};

module.exports = {
  startAutomaticTest,
  autoTestTerminalSubscriber,
};
