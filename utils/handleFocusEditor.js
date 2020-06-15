const vscode = require("vscode");

const handleFocusEditor = async ({ uri, userPosition }) => {
  try {
    const editorPath = vscode.Uri.file(uri);

    const editor = await vscode.window.showTextDocument(editorPath);

    const teastPos = {
      startLine: 100,
      endLine: 102,
      startCharacter: 2,
      endCharacter: 5,
    };

    const range = new vscode.Range(
      new vscode.Position(userPosition.startLine, userPosition.startCharacter),
      new vscode.Position(userPosition.endLine, userPosition.endCharacter)
    );

    editor.revealRange(range, 1);
  } catch (e) {
    console.log(`Error in handleFocusEditor: ${e}`);
  }
};

module.exports = {
  handleFocusEditor,
};
