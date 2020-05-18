// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const throttle = require("lodash.throttle");
const { WebSocketLink } = require("apollo-link-ws");
const { SubscriptionClient } = require("subscriptions-transport-ws");
const { execute, makePromise } = require("apollo-link");
const ws = require("ws");

const {
  stroveLiveshareSubscription,
  liveshareActivity,
} = require("./utils/queries");
const { websocketEndpoint } = require("./utils/endpoints");
const { handleLiveshareResponse } = require("./utils/handleLiveshareResponse");

const environment = process.env.STROVE_ENVIRONMENT;

const client = new SubscriptionClient(
  websocketEndpoint,
  {
    reconnect: true,
  },
  ws
);

const link = new WebSocketLink(client);

try {
  const liveshareActivityUpdate = (data) => {
    const liveshareActivityOperation = {
      query: liveshareActivity,
      variables: {
        userData: data,
      },
    };

    makePromise(execute(link, liveshareActivityOperation))
      .then()
      .catch((error) => console.log(`received error ${error}`));
  };

  const liveshareActivityInit = () => {
    const projectId = process.env.STROVE_PROJECT_ID || "123abc";

    const liveshareActivityOperation = {
      query: liveshareActivity,
      variables: {
        userData: {
          projectId,
        },
      },
    };

    makePromise(execute(link, liveshareActivityOperation))
      .then()
      .catch((error) => console.log(`received error ${error}`));
  };

  const throttleLiveshareActivityCall = throttle(liveshareActivityUpdate, 100, {
    leading: true,
  });

  // this method is called when your extension is activated
  // your extension is activated the very first time the command is executed
  /**
   * @param {vscode.ExtensionContext} context
   */
  function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log("stroveteams extension is active");

    // First call to get cursor positions of other users
    liveshareActivityInit();

    vscode.window.onDidChangeTextEditorSelection(
      ({ textEditor, selections }) => {
        // setTimeout(stopProject, idleTimeout);
        const data = {
          projectId: process.env.STROVE_PROJECT_ID || "123abc",
          userId: process.env.STROVE_USER_ID || "123",
          fullName: process.env.STROVE_USER_FULL_NAME,
          photoUrl: process.env.STROVE_PHOTO_URL,
          documentPath: textEditor._documentData._uri.path,
          selections,
        };

        throttleLiveshareActivityCall(data);
      }
    );

    let terminal;
    const terminals = vscode.window.terminals;

    if (terminals.length) {
      terminal = vscode.window.terminals[0];
    } else {
      terminal = vscode.window.createTerminal("strove");
    }

    if (process.env.STROVE_INIT_COMMAND) {
      terminal.sendText(process.env.STROVE_INIT_COMMAND);
    }

    /* Used for local debugging */
    if (environment === "local" || !environment) {
      terminal.sendText(process.env.STROVE_INIT_COMMAND || "yarn start");
    }
    terminal.show();
  }

  const stroveLiveshareOperation = {
    query: stroveLiveshareSubscription,
    variables: {
      userId: process.env.STROVE_USER_ID || "123",
      projectId: process.env.STROVE_PROJECT_ID || "123abc",
    },
  };

  const liveshareSubscriber = execute(link, stroveLiveshareOperation).subscribe(
    {
      next: (data) => {
        const {
          data: { stroveLiveshare },
        } = data;

        handleLiveshareResponse(stroveLiveshare);
      },
      error: (error) => console.log(`received error ${error}`),
      complete: () => console.log(`complete`),
    }
  );

  exports.activate = activate;

  // this method is called when your extension is deactivated
  function deactivate() {
    liveshareSubscriber.unsubscribe();
  }

  module.exports = {
    activate,
    deactivate,
  };
} catch (e) {
  console.log(e);
  module.exports = {
    activate: () => {},
    deactivate: () => {},
  };
}
