const vscode = require("vscode");

const environment = process.env.STROVE_ENVIRONMENT;

let liveshareActivity = {};
let decorationTypes = [];

const decorate = ({ decorationArray, decorationType }) => {
  const editor = vscode.window.activeTextEditor;

  editor.setDecorations(decorationType, decorationArray);
};

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
      fontWeight: "900",
      color: `rgba(${userData.color}, 1)`,
      contentText: ` ${userData.fullName}`,
    },
  });

const handleLiveshareResponse = (userDataArray) => {
  decorationTypes.forEach((type) => type.dispose());

  // console.log("userDataArray.length", userDataArray.length);

  userDataArray.forEach((userData) => {
    const userId = userData.userId;

    /* Skip decorating editor using users own activity data */
    if (
      (userId && userId !== process.env.STROVE_USER_ID) ||
      (userId && !environment)
    ) {
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
};

module.exports = {
  handleLiveshareResponse,
};
