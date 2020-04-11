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

const decorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "green",
  border: "2px solid white",
});

const decorate = ({ editor, decorationsArray }) => {
  let sourceCode = editor.document.getText();
  // let regex = /(console\.log)/;

  // let decorationsArray = [];

  const sourceCodeArr = sourceCode.split("\n");

  // for (let line = 0; line < sourceCodeArr.length; line++) {
  //   let match = sourceCodeArr[line].match(regex);

  //   if (match !== null && match.index !== undefined) {
  //     let range = new vscode.Range(
  //       new vscode.Position(line, match.index),
  //       new vscode.Position(line, match.index + match[1].length)
  //     );

  //     let decoration = { range };

  //     decorationsArray.push(decoration);
  //   }
  // }

  console.log("decorationsArray", decorationsArray);

  editor.setDecorations(decorationType, decorationsArray);
};

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

      console.log("liveshareActivity", liveshareActivity);

      const activeEditor = vscode.window.activeTextEditor;

      const someDecoration = vscode.window.createTextEditorDecorationType({
        borderWidth: "1px",
        borderStyle: "solid",
        overviewRulerColor: "blue",
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
          // this color will be used in light color themes
          borderColor: "darkblue",
        },
        dark: {
          // this color will be used in dark color themes
          borderColor: "lightblue",
        },
        after: {
          contentIconPath:
            "https://avatars1.githubusercontent.com/u/14284341?v=4",
        },
      });
      // activeEditor.setDecorations(someDecoration, [
      //   {
      //     range: new vscode.Range(0, 200),
      //     hoverMessage: "Number **" + "**",
      //   },
      // ]);

      decorate({
        editor: activeEditor,
        decorationsArray: [
          {
            range: [
              liveshareActivity["123"]["selections"][0]["start"],
              liveshareActivity["123"]["selections"][0]["end"],
            ],
          },
        ],
      });
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
