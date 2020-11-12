const vscode = require("vscode");
const writeEmitter = new vscode.EventEmitter();

let debugMode = false;

const startDebugging = async () => {
  const pty = {
    onDidWrite: writeEmitter.event,
    open: () => {
      writeEmitter.fire(
        `Welcome to stroveTeams debugger!\n\rAll defined logs will appear here.\n\r`
      );
      debugMode = true;
    },
    close: () => {
      debugMode - false;
    },
    handleInput: async () => {
      // disabling inputs
      return;
    },
  };

  const debugTerminal = await vscode.window.createTerminal({
    name: `stroveTeams debugger`,
    pty,
  });

  await debugTerminal.show();
};

const sendLog = (log) => {
  setTimeout(() => {
    if (debugMode) {
      const stringifiedLog = JSON.stringify(log);

      writeEmitter.fire(stringifiedLog);
      writeEmitter.fire(`\n\r`);
    }
  }, 5000);
};

module.exports = {
  startDebugging,
  sendLog,
};
