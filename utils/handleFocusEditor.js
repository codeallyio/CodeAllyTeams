const vscode = require("vscode");

const handleFocusEditor = async ({ uri }) => {
  try {
    console.log("uri", uri);
    const editorPath = vscode.Uri.file(uri, true);

    const editor = await vscode.window.showTextDocument(editorPath);

    // vscode.window.activeTextEditor = editor;
    // vscode.window.visibleTextEditors = [editor];
  } catch (e) {
    console.log(`Error in handleFocusEditor: ${e}`);
  }
};

module.exports = {
  handleFocusEditor,
};
