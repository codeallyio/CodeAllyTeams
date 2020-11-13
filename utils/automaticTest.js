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
          let testOutput = ''

          const terminal = {
            process: child_process.spawn("/bin/sh"),
            send: () => {
              // CHANGE !!!
              terminal.process.stdin.write(`cd ~/home/strove/project/${automaticTest.folderName} $$ ${automaticTest.testStartCommand}`);
            },
            initEvents: () => {
              // Handle Data
              terminal.process.stdout.on("data", (buffer) => {
                testOutput += buffer.toString("utf-8");
                // response = response.split(/[\r\n\t]+/g);
                // writeEmitter.fire(
                //   response.length > 1 ? response.join("\r\n") : response[0]
                // );
                // delete empty string
                // if (response.length > 2) response.pop();
                // sendCommand(response.length > 1 ? response.join("\r\n") : response[0]);
                // terminal.logger({ type: "data", data: buffer });
              });
          
              // Handle Closure
              terminal.process.on("close", (exitCode) => {
  
              if (exitCode === 0) {
                sendOutput('Test Passed.')
                // if (!!testOutput.match(/Test Passed!!!/g)) {
                //   sendOutput('Test Passed.')
                // }
                // else {
                //   sendOutput('Test Failed.')
                // }
              } else {
                sendOutput('Test Failed.')
              }
              });
            },
          };

          const outputTerminal = vscode.window.createTerminal("Test output");
          // Send test command start to the terminal
          outputTerminal.sendText(`${automaticTest.testStartCommand}`);
          outputTerminal.show();
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

const sendOutput = async (output) => {
  try {
    const setProjectDataMutation = {
      query: setProjectData,
      variables: {
        projectId: process.env.STROVE_PROJECT_ID || "123abc",
        testResolve: output,
      },
    };

    makePromise(execute(websocketLink, setProjectDataMutation))
      .then()
      .catch((error) => {
        console.log(`received error in sendOutput ${JSON.stringify(error)}`);

        Sentry.withScope((scope) => {
          scope.setExtras({
            data: setProjectDataMutation,
            location: "sendOutput -> mutation",
          });
          Sentry.captureException(error);
        });
      });
  } catch (e) {
    console.log("error in sendOutput: ", e);
    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { error: e },
        location: "sendOutput",
      });
      Sentry.captureMessage("Unexpected error!");
    });
  }
};

module.exports = {
  startAutomaticTest,
  autoTestTerminalSubscriber
};
