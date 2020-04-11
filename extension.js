// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const axios = require("axios").default;
const throttle = require("lodash.throttle");

const localEndpoint = "http://localhost:4040/liveshareActivity";

let liveshareActivity = {};

// const decorationType = vscode.window.createTextEditorDecorationType({
//   borderWidth: "1px",
//   borderStyle: "solid",
//   overviewRulerColor: "blue",
//   overviewRulerLane: vscode.OverviewRulerLane.Right,
//   light: {
//     // this color will be used in light color themes
//     borderColor: "darkblue",
//   },
//   dark: {
//     // this color will be used in dark color themes
//     borderColor: "lightblue",
//   },
//   after: {
//     contentIconPath: "https://avatars1.githubusercontent.com/u/14284341?v=4",
//   },
// });

/* TODO: Create this for each new user that joins the liveshare */
// const decorationType = vscode.window.createTextEditorDecorationType({
//   backgroundColor: "green",
//   border: "2px solid white",
// });

const createDecorationsType = (color) =>
  vscode.window.createTextEditorDecorationType({
    backgroundColor: color,
    border: `2px solid ${color}`,
  });

const decorate = ({ decorationsArray, decorationsType }) => {
  const editor = vscode.window.activeTextEditor;
  console.log("decorationsArray", decorationsArray);

  editor.setDecorations(decorationsType, decorationsArray);
};

const decorationsTypes = [];

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
        console.log("response color", response.data["123"].color);
        // we need to irate through users to make this work

        Object.values(response.data).forEach((userData) => {
          console.log("userData", userData);
          liveshareActivity[userData.userId] = {
            ...userData,
            // decorationsType: createDecorationsType(userData.color),
            // decorationsType:
            //   liveshareActivity?.[userData.userId]?.["decorationsType"] ||
            //   createDecorationsType(userData.color),
          };
        });
        // liveshareActivity[response.data.userId] = {
        //   ...response.data["123"],
        //   // decorationsType:
        //     liveshareActivity?.["123"]?.["decorationsType"] ||
        //     createDecorationsType(response.data["123"].color),
        // };

        console.log(
          'liveshareActivity["123"]["decorationsType"]',
          liveshareActivity["123"]
        );

        const decorationsType = createDecorationsType(
          response.data["123"].color
        );

        decorationsTypes.push[decorationsType];

        decorate({
          decorationsArray: [
            {
              range: new vscode.Range(
                new vscode.Position(
                  liveshareActivity["123"]["selections"][0]["start"]["line"],
                  liveshareActivity["123"]["selections"][0]["start"][
                    "character"
                  ]
                ),
                new vscode.Position(
                  liveshareActivity["123"]["selections"][0]["end"]["line"],
                  liveshareActivity["123"]["selections"][0]["end"]["character"]
                )
              ),
            },
          ],
          decorationsType, //liveshareActivity["123"]["decorationsType"],
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
