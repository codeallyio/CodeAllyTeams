const Sentry = require("@sentry/node");
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
