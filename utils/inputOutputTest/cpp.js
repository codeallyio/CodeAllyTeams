const fs = require("fs");
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

const handleCpp = async ({ testCommand, inputOutput }) => {
  try {
    const userFileContent = fs.readFileSync(pathUri.fsPath, "utf8");
  } catch (e) {
    console.log(`received error in handleCpp ${JSON.stringify(e)}`);

    sendLog(`received error in handleCpp ${JSON.stringify(e)}`);

    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { testCommand, inputOutput },
        location: "handleCpp",
      });
      Sentry.captureException(e);
    });
  }
};

const testFileContent = (INPUT_VALUE) => `
// Do NOT edit the main function
int main(int argc, char* argv[]) {
    std::cout << my_func(${INPUT_VALUE}) << std::endl;
    return 0;
}
`;

const typesTable = {
  number: "double",
  string: "std::string",
  boolean: "bool",
  ArrayString: "double[]",
  ArrayNumber: "string[]",
};

module.exports = {
  handleCpp,
};
