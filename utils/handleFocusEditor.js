const vscode = require("vscode");

const handleFocusEditor = async ({ uri, userPosition }) => {
  try {
    const editorPath = vscode.Uri.file(uri);

    const editor = await vscode.window.showTextDocument(editorPath);

    const range = new vscode.Range(
      new vscode.Position(
        userPosition.start.line,
        userPosition.start.character
      ),
      new vscode.Position(userPosition.end.line, userPosition.end.character)
    );

    editor.revealRange(range, 1);
  } catch (e) {
    console.log(`Error in handleFocusEditor: ${e}`);
  }
};

module.exports = {
  handleFocusEditor,
};
