// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fetch = require("node-fetch");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

const localEndpoint = "http://localhost:3000/liveshareActivity";

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "stroveteams" is now active!!!!!'
  );

  vscode.window.onDidChangeTextEditorSelection((e) => {
    console.log(e);
  });

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

      const dataToSend = {
        fileName: document.fileName,
        x: position.character,
        y: position.line,
      };

      fetch(localEndpoint, { method: "POST" })
        .then(function (response) {
          console.log("response", response);
        })
        .catch((error) => console.log("error", error));

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
    },
  });

  // fetch("http://example.com/movies.json")
  //   .then((response) => {
  //     console.log("response", response);
  //     return response.json();
  //   })
  //   .then((data) => {
  //     console.log("data", data);
  //   })
  //   .catch((error) => console.log("error", error));

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "extension.helloWorld",
    function () {
      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World!");
    }
  );

  context.subscriptions.push(disposable);
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

/*
	Liveshare sessions structure - used to determine active file and cursor position
	Created on first joinLiveshare mutation in a given project
	Cursor position updated on hover
	
	Note: It seems its best to make a separate subscription to prevent sending huge amounts
	of data many times a second
	*/
const projects = {
  // projectId
  projectId1: {
    user1Id: {
      documentUrl: "/src/assets/index.html",
      position: {
        x: 11,
        y: 2,
      },
    },
    user2Id: {
      documentUrl: "/package.json",
      position: {
        x: 1,
        y: 1,
      },
    },
  },
  // projectId
  project456Id: {
    user13455ID: {
      documentUrl: "/index.ts",
      position: {
        x: 1,
        y: 1,
      },
    },
  },
};
