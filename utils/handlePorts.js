const Sentry = require("@sentry/node");
const { sendLog } = require("./debugger");
const { execute, makePromise } = require("apollo-link");
const { websocketLink } = require("./websocketLink");
const { setProjectDataMutation } = require("./queries");

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

const portStates = {};
let checkInterval;

const monitorPorts = async () => {
  const portsEnvs = Object.keys(process.env).filter((key) =>
    key.includes("STROVE_PORT_")
  );
  const portsTable = portsEnvs.map((portEnv) => portEnv.split("_")[2]);

  portsTable.forEach((port) => {
    portStates[port] = "free";
  });

  checkInterval = setInterval(() => {
    portsTable.forEach((port) => {
      const previousState = portStates[port];

      if (isPortFree(port)) {
        portStates[port] = "free";
      } else {
        portStates[port] = "taken";
      }

      if (previousState !== portStates[port]) {
        sendPortStatus(port);
      }
    });
  }, 10000);
};

const isPortFree = (port) =>
  new Promise((resolve) => {
    const server = require("http")
      .createServer()
      .listen(port, () => {
        server.close();
        resolve(true);
      })
      .on("error", () => {
        resolve(false);
      });
  });

const sendPortStatus = async (port) => {
  try {
    const setProjectData = {
      query: setProjectDataMutation,
      variables: {
        id: process.env.STROVE_PROJECT_ID || "123abc",
        portStatus: {
          portNumber: port,
          status: portStates[port],
        },
      },
    };

    sendLog(
      `sendIOTestOutput - variables: ${JSON.stringify(
        setProjectData.variables
      )}`
    );

    makePromise(execute(websocketLink, setProjectData))
      .then((data) => sendLog(JSON.stringify(data)))
      .catch((error) => {
        sendLog(`received error in sendIOTestOutput ${error}`);
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
    console.log(`received error in sendPortStatus ${e}`);

    sendLog(`received error in sendPortStatus ${e}`);

    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { port },
        location: "sendPortStatus",
      });
      Sentry.captureException(e);
    });
  }
};

module.exports = {
  checkInterval,
  monitorPorts,
};
