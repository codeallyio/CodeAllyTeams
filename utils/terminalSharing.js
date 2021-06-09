const vscode = require("vscode");
const Sentry = require("@sentry/node");

const userType = process.env.CODEALLY_USER_TYPE;
const userId = process.env.CODEALLY_USER_ID || "123";
const environment = process.env.CODEALLY_ENVIRONMENT;

const isSharing = false;

Sentry.init({
  beforeSend(event) {
    if (environment === "production") {
      return event;
    }
    return null;
  },
  dsn: "https://8acd5bf9eafc402b8666e9d55186f620@o221478.ingest.sentry.io/5285294",
  maxValueLength: 1000,
  normalizeDepth: 10,
});

const terminalSharing = () => {};

const startSharing = async () => {
  const redirectedTerminal = vscode.window.createTerminal("Shared terminal");

  redirectedTerminal.sendText(
    `script -q -f /home/strove/.local/output-${userId}.txt`
  );

  redirectedTerminal.sendText("clear");

  await redirectedTerminal.show();
};

////////////////
const { activeUsersMock } = require("./dataMock");

// Copied from documentation, I don't know how to do it without a class
class TreeItem extends vscode.TreeItem {
  constructor(label, children) {
    super(
      label,
      children === undefined
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Expanded
    );
    this.children = children;
  }
}

// Copied from documentation and rewrote as function
const ActiveUsersTreeDataProvider = (fieldNames) => {
  const _onDidChangeTreeData = new vscode.EventEmitter();

  const onDidChangeTreeData = _onDidChangeTreeData.event;

  const data = [...fieldNames.map((fieldName) => new TreeItem(fieldName))];

  return {
    onDidChangeTreeData,

    data,

    getTreeItem: (element) => {
      return element;
    },

    getChildren: (element) => {
      if (element === undefined) {
        return data;
      }
      return element.children;
    },

    refresh: () => {
      _onDidChangeTreeData.fire(undefined);
    },
  };
};

const SharingManagementWebview = () => {
  let _view;

  // const uriPath = environment === "production" ? "" : ""

  let _extensionUri = vscode.Uri.parse(
    "/Users/mac/Desktop/SiliSky/extension/stroveTeams"
  );

  const resolveWebviewView = (webviewView, context, _token) => {
    _view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [_extensionUri],
    };

    webviewView.webview.html = _getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      // To DO later
      // switch (data.type) {
      // 	case 'colorSelected':
      // 		{
      // 			vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
      // 			break;
      // 		}
      // }
    });
  };

  const sendData = ({ message, additionalData }) => {
    if (_view) {
      _view.webview.postMessage({ message, additionalData });
    }
  };

  const _getHtmlForWebview = (webview) => {
    try {
      // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
      const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(_extensionUri, "media", "sharing.js")
      );

      // Do the same for the stylesheet.
      const styleResetUri = webview.asWebviewUri(
        vscode.Uri.joinPath(_extensionUri, "media", "reset.css")
      );
      const styleVSCodeUri = webview.asWebviewUri(
        vscode.Uri.joinPath(_extensionUri, "media", "vscode.css")
      );
      const styleMainUri = webview.asWebviewUri(
        vscode.Uri.joinPath(_extensionUri, "media", "sharing.css")
      );

      // Use a nonce to only allow a specific script to be run.
      const nonce = getNonce();

      let listData = "";
      Object.keys(activeUsersMock).map((key) => {
        listData += `<option value="${key}">${activeUsersMock[key].name}</option>`;
      });

      return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				
				<title>Cat Colors</title>
			</head>
			<body>
				<p>Start sharing your terminal with others in real-time.</p>

				<button class="styled-button" id="share-button">Start shared terminal</button>
                
                <hr>

                <p>Or you can also see other people's terminal.</p>
                <label for="user-list">Choose user whose shared terminal you want to see:</label>
                <br>
                <select name="user-list" class="styled-select" id="user-list">
                ${listData}
                </select>
                <button class="styled-button" id="receive-button">Show terminal</button>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    } catch (e) {
      console.log("error: ", e);
    }
  };

  return {
    resolveWebviewView,
    _getHtmlForWebview,
    viewType: "sharingManagement",
    _view,
    _extensionUri,
    sendData,
  };
};

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const registerCommands = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("activeUsers.refresh", (data) => {
      console.log("activeUsers.refresh -> data: ", data);
      ActiveUsersTreeDataProvider.refresh();
    })
  );
};

const constructViewPanel = async (context) => {
  registerCommands(context);

  const users = Object.keys(activeUsersMock).map(
    (key) => activeUsersMock[key].name
  );

  vscode.window.registerTreeDataProvider(
    "activeUsers",
    ActiveUsersTreeDataProvider(users)
  );

  const provider = SharingManagementWebview(context.extensionUri);

  vscode.window.registerWebviewViewProvider(provider.viewType, provider);
};

module.exports = {
  constructViewPanel,
};

// vscode.commands.executeCommand('editor.action.addCommentLine');

const testFunction = () => {
  const terminal = vscode.window.createTerminal("Testing");
  terminal.show();

  setTimeout(() => {
    terminal.dispose();

    const terminal2 = vscode.window.createTerminal("Testing 2");
    terminal2.show();
  }, 10000);
};

// Left for potential future reference
// https://stackoverflow.com/questions/51525821/activate-command-on-treeviewitem-click-vscode-extension
// class ClickableTreeItem extends vscode.TreeItem {
//   // children;

//   constructor(label) {
//     super(label);
//     this.command = {
//       title: "Start Sharing",
//       command: "startSharingButton.startSharing",
//     };
//   }
// }

// Also for reference if something doesn't work when it's defined as function
// class TreeDataProvider {
//   // onDidChangeTreeData;
//   // data;

//   constructor() {
//     this.data = [
//       new TreeItem("Currently Active Users:", [
//         ...users.map((userName) => new TreeItem(userName)),
//       ]),
//     ];
//   }

//   getTreeItem(element) {
//     return element;
//   }

//   getChildren(element) {
//     if (element === undefined) {
//       return this.data;
//     }
//     return element.children;
//   }
// }
