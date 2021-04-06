const Sentry = require("@sentry/node");
const { execute, makePromise } = require("apollo-link");
const { websocketLink } = require("./websocketLink");
const { startIOTestMutation } = require("./queries");
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

        if (startIOTest.language) {
          switch (startIOTest.language) {
            case "cpp":
              const handleCpp = require("./cpp");
              handleCpp(startIOTest);
              break;
            default:
              sendLog(`Language was not specified - testing impossible.`);
              console.log(`Language was not specified - testing impossible.`);
          }
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

module.exports = {
  startIOTest,
  startIOTestSubscriber,
};
