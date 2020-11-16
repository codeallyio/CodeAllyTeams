const vscode = require("vscode");
const Sentry = require("@sentry/node");
const { execute, makePromise } = require("apollo-link");
const { websocketLink } = require("./websocketLink");
const { receiveAutomaticTestSubscription } = require("./queries");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { sendLog } = require("./debugger")
const environment = process.env.STROVE_ENVIRONMENT;
const userId = process.env.STROVE_USER_ID || "123";
const child_process = require("child_process");
const { setProjectData } = require("./queries");

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
          let testOutput = '';
	  let testError = '';

          const terminal = {
            process: child_process.spawn("/bin/bash"),
            send: () => {
		sendLog(`cd ~/home/strove/project/${automaticTest.folderName} && ${automaticTest.testStartCommand}`)
              // CHANGE !!!
              // terminal.process.stdin.write(`cd /home/strove/project/${automaticTest.folderName} && ${automaticTest.testStartCommand} ; exit\n`);
		terminal.process.stdin.write("yarn ; exit\n");
            },
            initEvents: () => {
		sendLog("PING 2")
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
		sendLog(`PING STDOUT - ${buffer.toString("utf-8")}`)
              });

		terminal.process.stderr.on("data", (buffer) => {
		  testError += buffer.toString("utf-8");
		sendLog(`PING STDERR - ${buffer.toString("utf-8")}`)
		});

		terminal.process.on("error", (err) => {
		  sendLog(`PING MAX ERROR - ${err}`)
		});
          
              // Handle Closure
              terminal.process.on("exit", (exitCode) => {

		sendLog("EXIT")
		sendLog(exitCode)  
              if (exitCode === 0) {
		sendLog("TEST PASSED")
                sendOutput('Test Passed.')
                // if (!!testOutput.match(/Test Passed!!!/g)) {
                //   sendOutput('Test Passed.')
                // }
                // else {
                //   sendOutput('Test Failed.')
                // }
              } else {
		sendLog("TEST FAILED")
                sendOutput('Test Failed.')
              }
              });

		terminal.process.on("close", (exitCode) => {

		  sendLog("ERROR on CLOSE")
		  sendlog(exitCode)
	      });
		terminal.process.on("uncaughtException", (err) => {
		  sendLog("PING ERR.")
	      });

		sendLog("END PING")
            },
          };

	// terminal.process = child_process.spawn("yarn || exit", ["-lh", "/home/strove/project/node-task-typescript"])
	terminal.initEvents()
	terminal.send()

	sendLog(testOutput)

          const outputTerminal = vscode.window.createTerminal("Test output");
          // Send test command start to the terminal
          outputTerminal.sendText(`cd ${automaticTest.folderName} && ${automaticTest.testStartCommand}`);
          outputTerminal.show();
        }
      } catch (e) {
	sendLog(e)
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

	sendLog(setProjectDataMutation.variables)

    makePromise(execute(websocketLink, setProjectDataMutation))
      .then()
      .catch((error) => {
	sendLog(`MAKE PROMISE ERROR - ${error}`)
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
    sendLog(`TRY CATCH MUTATION - ${e}`)
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
