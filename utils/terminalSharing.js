const vscode = require("vscode");
const Sentry = require("@sentry/node");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { sendLog } = require("./debugger");
const { findGuest, ACTIVE_USERS_DATA } = require("./watchActiveUsers");

let wasWebviewActivated = false;
let sharedTerminal;

const userType = process.env.CODEALLY_USER_TYPE;
const myId = process.env.CODEALLY_USER_ID || "123";
const environment = process.env.CODEALLY_ENVIRONMENT;

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

  let data = [...fieldNames.map((fieldName) => new TreeItem(fieldName))];

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

    updateData: (fieldNames) =>
      (data = [...fieldNames.map((fieldName) => new TreeItem(fieldName))]),

    refresh: () => {
      _onDidChangeTreeData.fire(undefined);
    },
  };
};

const SharingManagementWebview = (_extensionUri) => {
  let _view;

  const resolveWebviewView = (webviewView, context, _token) => {
    _view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [_extensionUri],
    };

    webviewView.webview.html = _getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      const { instruction, additionalData } = data;

      console.log(
        "🚀 ~ file: terminalSharing.js ~ line 104 ~ webviewView.webview.onDidReceiveMessage ~ data",
        data
      );

      switch (instruction) {
        case "initialized": {
          if (!wasWebviewActivated) {
            wasWebviewActivated = true;
            _view.webview.postMessage({ message: "reset-state" });

            if (userType === "guest") {
              _view.webview.postMessage({ message: "set-sharing-flag-true" });
              startSharing();
            } else {
              const guest = findGuest();

              if (guest) startReceiving({ userId: guest.id });
            }
          }
          break;
        }
        case "start-receiving": {
          startReceiving(additionalData);
          break;
        }
        case "start-sharing": {
          startSharing();
          break;
        }
        case "restart-sharing": {
          restartSharing();
          break;
        }
      }
    });
  };

  const sendData = ({ message, additionalData }) => {
    if (_view) {
      _view.webview.postMessage({ message, additionalData });
    }
  };

  const resetState = () => {
    if (_view) {
      _view.webview.postMessage({ message: "reset-state" });
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
      Object.keys(ACTIVE_USERS_DATA).map((key) => {
        listData += `<option value="${key}">${ACTIVE_USERS_DATA[key].name}</option>`;
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
    viewType: "sharingManagement",
    sendData,
    resetState,
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

// case "start-receiving": {
const startReceiving = async ({ userId }) => {
  try {
    let STARTING_TERMINAL = true;

    const userName = ACTIVE_USERS_DATA[userId].name;
    const terminal = vscode.window.createTerminal(`${userName}'s terminal`);

    let whileCounter = 0;

    while (STARTING_TERMINAL) {
      let response;
      try {
        response = await exec(
          `find /home/strove/.local -maxdepth 2 -name "output-${userId}.txt" -print -quit`
        );
      } catch (e) {
        response = null;
        Sentry.captureMessage(`First error: ${e}`);
      }

      whileCounter++;

      await new Promise((resolve) =>
        setTimeout(() => {
          resolve();
        }, 500)
      );

      if (response && response.stdout) {
        await terminal.sendText(
          `tail -q -f /home/strove/.local/output-${userId}.txt`
        );

        await terminal.show();

        STARTING_TERMINAL = false;
      } else if (whileCounter >= 20) {
        await terminal.sendText(
          `echo "Error happened during terminal sharing. Try refreshing."`
        );

        await terminal.show();

        STARTING_TERMINAL = false;
      }
    }
  } catch (e) {
    console.log("received error in terminalSharing -> startReceiving: ", e);
    sendLog(`received error in terminalSharing -> startReceiving: ${e}`);
    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { error: e },
        location: "terminalSharing -> startReceiving",
      });
      Sentry.captureMessage("Unexpected error!");
    });
  }
};

const startSharing = async () => {
  try {
    // Start braodcasting terminal for everyone
    sharedTerminal = vscode.window.createTerminal("Shared terminal");

    sharedTerminal.sendText(
      `script -q -f /home/strove/.local/output-${myId}.txt`
    );

    sharedTerminal.sendText("clear");

    sharedTerminal.show();
  } catch (e) {
    console.log(
      `received error in terminalSharing -> startSharing ${JSON.stringify(e)}`
    );

    sendLog(`received error in terminalSharing -> startSharing ${e}`);

    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { error: e },
        location: "terminalSharing -> startSharing",
      });
      Sentry.captureMessage("Unexpected error!");
    });
  }
};

const restartSharing = async () => {
  try {
    if (sharedTerminal) {
      sharedTerminal.sendText("exit");

      await sharedTerminal.dispose();

      startSharing();
    } else {
      startSharing();
    }
  } catch (e) {
    console.log(
      `received error in terminalSharing -> restartSharing ${JSON.stringify(e)}`
    );

    sendLog(`received error in terminalSharing -> restartSharing ${e}`);

    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { error: e },
        location: "terminalSharing -> restartSharing",
      });
      Sentry.captureMessage("Unexpected error!");
    });
  }
};

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

  const users = Object.keys(ACTIVE_USERS_DATA).map(
    (key) => ACTIVE_USERS_DATA[key].name
  );

  vscode.window.registerTreeDataProvider(
    "activeUsers",
    ActiveUsersTreeDataProvider(users)
  );

  const WebviewView = SharingManagementWebview(context.extensionUri);

  vscode.window.registerWebviewViewProvider(WebviewView.viewType, WebviewView);
};

module.exports = {
  constructViewPanel,
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
