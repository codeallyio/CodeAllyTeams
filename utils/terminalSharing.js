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

const registerCommands = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("activeUsers.refresh", (data) => {
      console.log("activeUsers.refresh -> data: ", data);
      ActiveUsersTreeDataProvider.refresh();
    })
  );
};

const constructViewPanel = (context) => {
  registerCommands(context);

  const users = Object.keys(activeUsersMock).map(
    (key) => activeUsersMock[key].name
  );

  vscode.window.registerTreeDataProvider(
    "activeUsers",
    ActiveUsersTreeDataProvider(users)
  );
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
