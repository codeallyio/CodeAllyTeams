// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const axios = require("axios").default;
const throttle = require("lodash.throttle");

let endpoint;

if (
  process.envSTROVE_ENVIRONMENT === "local" ||
  !process.envSTROVE_ENVIRONMENT
) {
  endpoint = "http://localhost:4040/liveshareActivity";
} else if (process.envSTROVE_ENVIRONMENT === "development") {
  endpoint = "https://graphql.strove.io/liveshareActivity";
} else {
  endpoint = "https://api.strove.io/liveshareActivity";
}

let liveshareActivity = {};

const createDecorationType = ({ userData }) =>
  vscode.window.createTextEditorDecorationType({
    border: `1px solid rgba(${userData.color}, 1)`,
    backgroundColor: `rgba(${userData.color}, 0.3)`,
    // after: {
    //   height: "15px",
    //   width: "15px",
    //   // contentIconPath: vscode.Uri.parse(
    //   //   "https://avatars1.githubusercontent.com/u/14284341?v=4"
    //   // ),
    //   color: userData.color,
    //   contentText: userData.fullName,
    // },
  });

const createUserNameDecorationType = ({ userData }) =>
  vscode.window.createTextEditorDecorationType({
    after: {
      margin: "20px",
      /* This can be used to pass avatar but we need to resize it on the server side first */
      // contentIconPath: vscode.Uri.parse(
      //   "https://avatars1.githubusercontent.com/u/14284341?v=4"
      // ),
      color: `rgba(${userData.color})`,
      contentText: ` ${userData.fullName}`,
    },
  });

const decorate = ({ decorationArray, decorationType }) => {
  const editor = vscode.window.activeTextEditor;

  editor.setDecorations(decorationType, decorationArray);
};

let decorationTypes = [];

const throttleCall = throttle(
  (data) =>
    axios
      .post(endpoint, {
        ...data,
        credentials: "include",
        referrerPolicy: "unsafe-url",
      })
      .then(function (response) {
        decorationTypes.forEach((type) => type.dispose());

        const userDataArray = Object.values(response.data);

        console.log("userDataArray.length", userDataArray.length);

        /* Theres no point to do any of those if there is no user */
        if (userDataArray.length > 1) {
          userDataArray.forEach((userData) => {
            const userId = userData.userId;

            if (userId) {
              /*
              We create a new object because liveshareActivity[userId] = userData has
              circular type and node does not show it's contents in the console making
              debugging harder.
            */
              liveshareActivity[userId] = {
                ...userData,
              };

              const editor = vscode.window.activeTextEditor;
              const isEditorPathTheSameAsUsers =
                editor._documentData._uri.path === userData.documentPath;

              if (isEditorPathTheSameAsUsers) {
                const codeDecorationType = createDecorationType({
                  userData,
                });

                /* Need to make another decoration just to append user name at the end of the last selected line */
                const userNameDecorationType = createUserNameDecorationType({
                  userData,
                });

                const lastLine = userData["selections"][0]["end"]["line"];
                const lastLineLastCharacterPosition =
                  editor._documentData._lines[lastLine].length;

                decorationTypes = [
                  ...decorationTypes,
                  codeDecorationType,
                  userNameDecorationType,
                ];

                console.log(
                  "editor",
                  editor,
                  "isEditorPathTheSameAsUsers",
                  isEditorPathTheSameAsUsers,
                  "editor._documentData._uri.path",
                  editor._documentData._uri.path,
                  "userData.documentPath",
                  userData.documentPath
                  // "userData",
                  // userData,
                  // "liveshareActivity",
                  // liveshareActivity
                );

                /* Decorate code */
                decorate({
                  decorationArray: [
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
                  decorationType: codeDecorationType,
                });

                /* Append user name at the end */
                decorate({
                  decorationArray: [
                    {
                      range: new vscode.Range(
                        new vscode.Position(
                          userData["selections"][0]["end"]["line"],
                          lastLineLastCharacterPosition
                        ),
                        new vscode.Position(
                          userData["selections"][0]["end"]["line"],
                          lastLineLastCharacterPosition
                        )
                      ),
                    },
                  ],
                  decorationType: userNameDecorationType,
                });
              }
            }
          });
        }
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

  /* Make sure to also refresh editor data once in a while if user does not actively type */
  setInterval(
    () => throttleCall({ projectId: process.env.STROVE_PROJECT_ID }),
    2000
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
      userId: process.env.STROVE_USER_ID || "123",
      fullName: process.env.STROVE_USER_FULL_NAME,
      photoUrl: process.env.STROVE_PHOTO_URL,
      documentPath: textEditor._documentData._uri.path,
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
