const vscode = require("vscode");
const { sendLog } = require("./debugger");
const { languagesData } = require("./runIOTests");

const watchFileChange = async () => {
  const initialFilePath = vscode.window.activeTextEditor.document.fileName;

  const initialFileNameArray = initialFilePath.split("/");
  const initialFileName = initialFileNameArray[initialFileNameArray.length - 1];

  console.log(
    "🚀 ~ file: extension.js ~ line 132 ~ activate ~ initialFileName",
    initialFileName
  );

  sendLog(
    `🚀 ~ file: extension.js ~ line 132 ~ activate ~ initialFileName: ${initialFileName}`
  );

  sendCurrentLanguage(initialFileName);

  vscode.window.onDidChangeActiveTextEditor(({ document }) => {
    // document.fileName /Users/mac/Desktop/SiliSky/gitTest/GitServerTesting/README.md
    // document.fileName /Users/mac/Desktop/SiliSky/gitTest/GitServerTesting/index.js
    // document.fileName /Users/mac/Desktop/SiliSky/gitTest/GitServerTesting/package.json
    // Despite the name it returns the whole path
    const { fileName } = document;

    const fileNameArray = fileName.split("/");
    const actualFileName = fileNameArray[fileNameArray.length - 1];

    console.log("actualFileName", actualFileName);

    sendLog(`actualFileName: ${actualFileName}`);

    sendCurrentLanguage(actualFileName);
  });
};

const sendCurrentLanguage = async (fileName) => {
  const currentLanguage = Object.keys(languagesData).find(
    (language) => languagesData[language].fileName === fileName
  );
  console.log(
    "🚀 ~ file: watchFileChange.js ~ line 40 ~ sendCurrentLanguage ~ currentLanguage",
    currentLanguage
  );
};

module.exports = {
  watchFileChange,
};
