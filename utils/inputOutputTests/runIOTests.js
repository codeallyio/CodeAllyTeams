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
    if (inputOutput && inputOutput.length > 0 && testCommand) {
      const { fileName, testFileContent } = languagesData[language];

      const pathToFile = vscode.Uri.file(`/home/strove/project/${fileName}`);

      const pathUri = pathToFile.with({ scheme: "vscode-resource" });

      const userFileContent = fs.readFileSync(pathUri.fsPath, "utf8");

      let counter = 0;
      const maxValue = inputOutput.length();

      const results = [];

      while (counter < maxValue) {
        const { input } = inputOutput[counter];
        fs.writeFileSync(
          `/home/strove/${fileName}`,
          "" + testFileContent({ inputValue: input.value, userFileContent }),
          "utf8"
        );

        const { stdout } = await exec(testCommand);

        results.push(stdout.slice(0, -1));

        await exec(`sudo rm -rf /home/strove/${fileName}`);
      }

      return results;
    }
  } catch (e) {
    console.log(`received error in runIOTests ${JSON.stringify(e)}`);

    sendLog(`received error in runIOTests ${JSON.stringify(e)}`);

    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { testCommand, inputOutput },
        location: "runIOTests",
      });
      Sentry.captureException(e);
    });
  }
};

const languagesData = {
  cpp: {
    fileName: "main.cpp",
    testFileContent: ({ inputValue, userFileContent }) => `
        ${userFileContent}

        int main(int argc, char* argv[]) {
            std::cout << main_function(${inputValue}) << std::endl;
            return 0;
        }
    `,
  },
  python: {
    fileName: "main.py",
    testFileContent: ({ inputValue, userFileContent }) => `
        ${userFileContent}

        print(main_function(${inputValue}))
    `,
  },
  java: {
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
  csharp: {
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
  javascript: {
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
