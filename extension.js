// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const axios = require("axios").default;
const throttle = require("lodash.throttle");

const localEndpoint = "http://localhost:4040/liveshareActivity";

let liveshareActivity = {};

const createDecorationsType = ({ userData }) =>
  vscode.window.createTextEditorDecorationType({
    border: `2px solid rgba(${userData.color}, 1)`,
    backgroundColor: `rgba(${userData.color}, 0.3)`,
    after: {
      height: "15px",
      width: "15px",
      contentIconPath: vscode.Uri.parse(
        "https://avatars1.githubusercontent.com/u/14284341?v=4"
      ),
      color: userData.color,
      contentText: userData.fullName,
    },
  });

const decorate = ({ decorationsArray, decorationsType }) => {
  const editor = vscode.window.activeTextEditor;

  editor.setDecorations(decorationsType, decorationsArray);
};

let decorationsTypes = [];

const throttleCall = throttle(
  (data) =>
    axios
      .post(localEndpoint, {
        ...data,
        credentials: "include",
        referrerPolicy: "unsafe-url",
      })
      .then(function (response) {
        decorationsTypes.forEach((type) => type.dispose());

        Object.values(response.data).forEach((userData) => {
          const userId = userData.userId;
          liveshareActivity[userId] = { ...userData };

          const decorationsType = createDecorationsType({ userData });

          /* ToDO: Need to make another decoration just to append user name at the end of the last selected line */
          const editor = vscode.window.activeTextEditor;
          console.log("editor", editor);

          const lastLine = userData["selections"][0]["end"]["line"];

          decorationsTypes = [...decorationsTypes, decorationsType];

          console.log(
            "userData",
            userData,
            "liveshareActivity",
            liveshareActivity
          );

          decorate({
            decorationsArray: [
              {
                range: new vscode.Range(
                  new vscode.Position(
                    userData["selections"][0]["start"]["line"],
                    userData["selections"][0]["start"]["character"]
                  ),
                  new vscode.Position(
                    userData["selections"][0]["end"]["line"],
                    userData["selections"][0]["end"]["character"]
                  )
                ),
              },
            ],
            decorationsType,
          });
        });
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

  vscode.languages.registerHoverProvider("*", {
    provideHover(document, position, token) {
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
      // console.log("liveshareActivity", liveshareActivity);
    },
  });

  vscode.window.onDidChangeTextEditorSelection(({ textEditor, selections }) => {
    const data = {
      projectId: process.env.STROVE_PROJECT_ID,
      userId: process.env.STROVE_USER_ID,
      fullName: process.env.STROVE_USER_FULL_NAME,
      photoUrl: process.env.STROVE_PHOTO_URL,
      filePath: textEditor._documentData._uri.path,
      selections,
    };

    throttleCall(data);
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
