const Sentry = require("@sentry/node");
const { execute, makePromise } = require("apollo-link");
const { websocketLink } = require("./websocketLink");
const { startIOTestMutation, setProjectDataMutation } = require("./queries");
const { sendLog } = require("./debugger");

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

const startIOTestOperation = {
  query: startIOTestMutation,
  variables: {
    projectId: process.env.STROVE_PROJECT_ID || "123abc",
  },
};

let startIOTestSubscriber = null;
let readyToTest = true;

const startIOTest = () => {
  // Start terminal if ping arrives
  startIOTestSubscriber = execute(
    websocketLink,
    startIOTestOperation
  ).subscribe({
    next: async (data) => {
      try {
        const {
          data: { startIOTest },
        } = data;

        if (startIOTest.language && readyToTest) {
          readyToTest = false;
          let outputs = [];
          switch (startIOTest.language) {
            case "cpp":
              const handleCpp = require("./cpp");
              outputs = await handleCpp(startIOTest);
              break;
            default:
              sendLog(`Language was not recognized - testing impossible.`);
              console.log(`Language was not recognized - testing impossible.`);
          }

          await sendIOTestOutput({ outputs, language: startIOTest.language });
          readyToTest = true;
        }
      } catch (e) {
        sendLog(`startIOTest - tryCatch: ${JSON.stringify(e)}`);

        console.log(
          `received error in startIOTest -> startIOTestSubscriber -> next ${JSON.stringify(
            e
          )}`
        );

        Sentry.withScope((scope) => {
          scope.setExtras({
            data: startIOTestOperation,
            location: "startIOTest -> startIOTestSubscriber -> next",
          });
          Sentry.captureException(e);
        });
      }
    },
    error: (error) => {
      sendLog(`startIOTest - error: ${JSON.stringify(error)}`);
      console.log(
        `received error in startIOTestSubscriber ${JSON.stringify(error)}`
      );

      Sentry.withScope((scope) => {
        scope.setExtras({
          data: startIOTestOperation,
          location: "startIOTest -> startIOTestSubscriber",
        });
        Sentry.captureException(error);
      });
    },
    complete: () => console.log(`complete`),
  });
};

const sendIOTestOutput = async ({ outputs, language }) => {
  try {
    const setProjectData = {
      query: setProjectDataMutation,
      variables: {
        id: process.env.STROVE_PROJECT_ID || "123abc",
        ioTestOutputs: {
          language,
          outputs,
        },
      },
    };

    sendLog(`sendIOTestOutput - variables: ${setProjectData.variables}`);

    makePromise(execute(websocketLink, setProjectData))
      .then()
      .catch((error) => {
        console.log(
          `received error in sendIOTestOutput ${JSON.stringify(error)}`
        );

        Sentry.withScope((scope) => {
          scope.setExtras({
            data: setProjectData,
            location: "sendIOTestOutput -> mutation",
          });
          Sentry.captureException(error);
        });
      });
  } catch (e) {
    sendLog(`sendIOTestOutput - tryCatch: ${e}`);
    console.log("error in sendIOTestOutput: ", e);
    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { error: e },
        location: "sendIOTestOutput",
      });
      Sentry.captureMessage("Unexpected error!");
    });
  }
};

module.exports = {
  startIOTest,
  startIOTestSubscriber,
};
