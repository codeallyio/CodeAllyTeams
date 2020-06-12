const vscode = require("vscode");

const handleFocusEditor = ({ uri }) => {
  try {
    const editorPath = vscode.Uri.file(uri);

    vscode.window.showTextDocument(editorPath);

    // TextEditor.revealRange
  } catch (e) {
    console.log(`Error in handleFocusEditor: ${e}`);
  }
};

module.exports = {
  handleFocusEditor,
};
