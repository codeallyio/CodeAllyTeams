const vscode = require("vscode");
const fs = require("fs");
const Sentry = require("@sentry/node");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

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
    if (inputOutput && inputOutput.length > 0 && testCommand) {
      const pathToFile = vscode.Uri.file("/home/strove/project/main.cpp");

      const pathUri = pathToFile.with({ scheme: "vscode-resource" });

      const cppFileContent = fs.readFileSync(pathUri.fsPath, "utf8");

      let counter = 0;
      const maxValue = inputOutput.length();

      const results = [];

      while (counter < maxValue) {
        const { input } = inputOutput[counter];
        fs.writeFileSync(
          `/home/strove/main.cpp`,
          "" + cppFileContent + testFileContent(input.value),
          "utf8"
        );

        const { stdout } = await exec(testCommand);

        results.push(stdout.slice(0, -1));

        await exec(`sudo rm -rf /home/strove/main.cpp`);
      }

      return results;
    }
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
