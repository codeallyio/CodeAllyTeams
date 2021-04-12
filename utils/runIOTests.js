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

const runIOTests = async ({ testCommand, inputOutput, language }) => {
  try {
    sendLog("in runIOTests");
    if (inputOutput && inputOutput.length > 0 && testCommand) {
      const { fileName, testFileContent } = languagesData[language];

      const pathToFile = vscode.Uri.file(`/home/strove/project/${fileName}`);

      const pathUri = pathToFile.with({ scheme: "vscode-resource" });

      const userFileContent = fs.readFileSync(pathUri.fsPath, "utf8");

      sendLog(userFileContent);

      let counter = 0;
      const maxValue = inputOutput.length;

      sendLog(`maxValue - ${maxValue}`);

      const results = [];

      while (counter < maxValue) {
        const { input } = inputOutput[counter];
        fs.writeFileSync(
          `/home/strove/${fileName}`,
          "" + testFileContent({ inputValue: input.value, userFileContent }),
          "utf8"
        );

        sendLog(`testCommand - ${testCommand}`);

        const response = await exec(testCommand);

        sendLog(`stdout - ${JSON.stringify(response)}`);

        results.push(response.stdout.slice(0, -1));

        sendLog(`results - ${results}`);

        // const response2 = await exec(`sudo rm -rf /home/strove/${fileName}`);

        // sendLog(`response2 - ${JSON.stringify(response2)}`);

        counter++;

        sendLog(`counter - ${counter}`);
      }

      return results;
    }
  } catch (e) {
    console.log(`received error in runIOTests ${e}`);

    sendLog(`received error in runIOTests ${e}`);

    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { testCommand, inputOutput },
        location: "runIOTests",
      });
      Sentry.captureException(e);
    });

    return ["User caused unknown error - user's code not working"];
  }
};

const languagesData = {
  "C++": {
    fileName: "main.cpp",
    testFileContent: ({ inputValue, userFileContent }) => `
        ${userFileContent}

        int main(int argc, char* argv[]) {
            std::cout << main_function(${inputValue}) << std::endl;
            return 0;
        }
    `,
  },
  Python: {
    fileName: "main.py",
    testFileContent: ({ inputValue, userFileContent }) => `
        ${userFileContent}

        print(main_function(${inputValue}))
    `,
  },
  Java: {
    fileName: "main.java",
    testFileContent: ({ inputValue, userFileContent }) => `
    class Main {
        ${userFileContent}

        public static void main(String[] args) {
            System.out.println(main_function(${inputValue}));
        }
    }
    `,
  },
  "C#": {
    fileName: "main.cs",
    testFileContent: ({ inputValue, userFileContent }) => `
    class MainClass {
        ${userFileContent}

        public static void Main(string[] args) {
            System.Console.WriteLine(MainFunction(${inputValue}));
        }
    }
    `,
  },
  JavaScript: {
    fileName: "index.js",
    testFileContent: ({ inputValue, userFileContent }) => `
        ${userFileContent}

        console.log(mainFunction(${inputValue}))
    `,
  },
};

module.exports = {
  runIOTests,
};
