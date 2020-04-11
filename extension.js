// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const axios = require("axios").default;
const throttle = require("lodash.throttle");

const localEndpoint = "http://localhost:4040/liveshareActivity";

let liveshareActivity = {};

const throttleCall = throttle(
  (data) =>
    axios
      .post(localEndpoint, {
        ...data,
        credentials: "include",
        referrerPolicy: "unsafe-url",
      })
      .then(function (response) {
        console.log("response", response);
        liveshareActivity = response.data;
      })
      .catch((error) => console.log("error", error)),
  500,
  { leading: true }
);

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "stroveteams" is now active!!!!!'
  );

  // vscode.languages.registerHoverProvider("*", {
  //   provideHover(document, position, token) {
  // 			document
  // fileName:"/Users/adamzaczek/Desktop/stroveClient/src/components/header/homeLink.js"
  // isUntitled:false
  // languageId:"javascript"
  // version:1
  // isClosed:false
  // isDirty:false
  // eol:1
  // lineCount:77
  // hovered position
  // extension.js:23
  // position
  // line: 9;
  // character: 22;

  // const dataToSend = {
  //   fileName: document.fileName,
  //   x: position.character,
  //   y: position.line,
  // };

  // console.log("dataToSend", dataToSend);
  // console.log(
  //   "hovered document",
  //   document,
  //   "hovered position",
  //   position,
  //   "token",
  //   token
  // );
  // return new vscode.Hover("I am a hover!");
  //   },
  // });

  vscode.window.onDidChangeTextEditorSelection(({ textEditor, selections }) => {
    const activeEditor = vscode.window.activeTextEditor;

    const data = {
      projectId: process.env.PROJECT_ID,
      userId: process.env.STROVE_USER_ID,
      filePath: textEditor._documentData._uri.path,
      selections,
    };

    throttleCall(data);

    console.log("liveshareActivity", liveshareActivity);

    const someDecoration = vscode.window.createTextEditorDecorationType({
      cursor: "crosshair",
      // use a themable color. See package.json for the declaration and default values.
      backgroundColor: "red",
      after: {},
    });
  });

  vscode.window.createTerminal("strove");
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
