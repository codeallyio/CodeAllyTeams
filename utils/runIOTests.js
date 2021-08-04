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

const runIOTests = async ({ testCommand, inputOutput, language, createdFromFile }) => {
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
        const { input, output } = inputOutput[counter];
        // let inputValue = "";
        // if (input.type === "String") {
        //   inputValue = `"${input.value}"`;
        // } else {
        //   inputValue = input.value;
        // }
        fs.writeFileSync(
          `/home/strove/${fileName}`,
          "" +
            testFileContent({
              createdFromFile,
              inputType: input.type,
              inputValue: input.value,
              outputType: output.type,
              userFileContent,
            }),
          "utf8"
        );

        sendLog(`testCommand - ${testCommand}`);

        // const response = await exec("cd /home/strove && " + testCommand, {
        //   timeout: 10000,
        // });

        const response = await exec(testCommand, {
          timeout: 10000,
          cwd: "/home/strove",
        });

        if (response && response.stderr) throw response.stderr;

        sendLog(`stdout - ${JSON.stringify(response)}`);

        results.push(response.stdout.slice(0, -1).trim());

        sendLog(`results - ${results}`);

        const response2 = await exec(`sudo rm -rf /home/strove/${fileName}`);

        sendLog(`response2 - ${JSON.stringify(response2)}`);

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

    const { fileName } = languagesData[language];

    const response = await exec(`sudo rm -rf /home/strove/${fileName}`);

    sendLog(`response2 - ${JSON.stringify(response)}`);

    if (typeof e === "string") {
      return new Array(inputOutput.length).fill(`${e}`);
    } else {
      return new Array(inputOutput.length).fill(
        e.stderr || `Caught unknown error: ${e}`
      );
    }
  }
};
const execFuncCpp = (inputType, inputValue, createdFromFile, outputType) => {
  if(createdFromFile){
    if(outputType.includes("*")){
      /*pointers
      examples
      ${outputType} = double *
      ${inputType} = long long int arr[]examples
      ${inputValue} = {1,2,3}
      */
      return `
      ${outputType}p;
      ${inputType} = ${inputValue};
      p = main_function(arr);
      size_t n = sizeof(arr)/sizeof(p);
      std::string result = "{";
      for(int i=0; i<n; i++){
        result+=arr[i];
        if(i != n-1){
            result+=",";
        }
      }
      result+="}";
      std::cout << result;
      `;

    }else if(inputType.includes("[]")) {
      //arrays
      return `${inputType} = ${inputValue};std::cout << main_function(arr) << std::endl;`;
    }
    else{
      //other fundamental types
        return `std::cout << main_function(${inputValue}) << std::endl;`;
    }
  }else{
    if (inputType === "ArrayString") {
      return `std::string arr[] = ${inputValue};std::cout << main_function(arr) << std::endl;`;
    }
    if (inputType === "ArrayNumber") {
      return `double arr[] = ${inputValue};std::cout << main_function(arr) << std::endl;`;
    }
    return `std::cout << main_function(${inputValue}) << std::endl;`;
  }
};
const execFuncJava = (inputValue, outputType) => {
  if(outputType.includes("[]")){
    return `System.out.println(Arrays.toString(main_function(${inputValue})));`
  }
  return `System.out.println(main_function(${inputValue}));`
};
const execFuncCSharp = (inputValue, outputType) => {
  if(outputType.includes("[]")){
    return `System.Console.WriteLine("[" + string.Join(",",MainFunction(${inputValue})) + "]");`
  }
  return `System.Console.WriteLine(MainFunction(${inputValue}));`
};
// Some languages have weird formatting but it's necessary for them to work
const languagesData = {
  "C++": {
    fileName: "main.cpp",
    testFileContent: ({ inputType, inputValue, userFileContent,createdFromFile,outputType }) => `
        ${userFileContent}

        int main(int argc, char* argv[]) {
          try {
            ${execFuncCpp(inputType, inputValue, createdFromFile,outputType)}
            return 0;
          } catch (const std::runtime_error& re) {
            std::cerr << "Runtime error: " << re.what() << std::endl;
            return 0;
          } catch(const std::exception& ex) {
            std::cerr << "Error occurred: " << ex.what() << std::endl;
            return 0;
          } catch(...) {
            std::cerr << "Unknown failure occurred. Possible memory corruption" << std::endl;
            return 0;
          }
        }
    `,
  },
  Python: {
    fileName: "main.py",
    testFileContent: ({ inputValue, userFileContent }) => `
import logging

${userFileContent}

try:
  print(main_function(${inputValue}))
except Exception as exception:
  logging.error(exception, exc_info=True)
`,
  },
  Java: {
    fileName: "main.java",
    testFileContent: ({ inputValue, userFileContent, outputType }) => `
    import java.util.*;
    import java.lang.*;
    class Main {
        ${userFileContent}

        public static void main(String[] args) {
          try {
            ${execFuncJava(inputValue, outputType)}
          } catch (Exception e) {
            System.out.println(e);
          }
        }
    }
    `,
  },
  "C#": {
    fileName: "main.cs",
    testFileContent: ({ inputValue, userFileContent, outputType  }) => `
    class MainClass {
        ${userFileContent}

        public static void Main(string[] args) {
          try {
            ${execFuncCSharp(inputValue,outputType)}
          } catch (System.Exception e) {
            System.Console.WriteLine(e);
          }
        }
    }
    `,
  },
  JavaScript: {
    fileName: "main.js",
    testFileContent: ({ inputValue, userFileContent }) => `
        ${userFileContent}

        try {
          console.log(mainFunction(${inputValue}))
        } catch (e) {
          console.log("Error: ", e)
        }
    `,
  },
  Ruby: {
    fileName: "main.rb",
    testFileContent: ({ inputValue, userFileContent }) => `
${userFileContent}

begin
  puts TestClass.test_function(${inputValue})
rescue => e
  puts "Caught an error: #{e}"
end
    `,
  },
};

module.exports = {
  runIOTests,
  languagesData,
};
