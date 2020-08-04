const vscode = require("vscode");

const { terminal, writeEmitter } = require("./terminalProcess");

terminal.initEvents();

const broadcastTerminal = async () => {
  // const arrows = ["\u001b[C", "\u001b[B", "\u001b[D", "\u001b[A"];
  // Get hex codes from here if necessary: https://www.codetable.net/Group/arrows  -  may be usefull for ubuntu
  try {
    console.log("in try");
    let line = "";
    const pty = {
      onDidWrite: writeEmitter.event,
      open: () => {
        writeEmitter.fire("Type and press enter to echo the text\r\n\r\n");
        console.log("open fired");
      },
      close: () => {
        /* noop */
      },
      handleInput: async (data) => {
        try {
          console.log(JSON.stringify(data));
          if (data === "\r") {
            // Enter
            writeEmitter.fire(`\r\n\r\n`);
            terminal.send(line + "");

            line = "";
            return;
          }
          if (data === "\x7f") {
            // Backspace
            if (line.length === 0) {
              return;
            }
            line = line.substr(0, line.length - 1);
            // Move cursor backward
            writeEmitter.fire("\x1b[D");
            // Delete character
            writeEmitter.fire("\x1b[P");
            return;
          }
          if (data === "\u001b[A" || data === "\u001b[B") {
            return;
            // writeEmitter.fire("yo");
          }
          // if (data && typeof data === "string" && data.match(/[A-Z][a-z][0-9]/g))
          line += data;
          writeEmitter.fire(data);
        } catch (e) {
          console.log("error in handleTerminal -> handleInput: ", e);
        }
      },
      //   handleInput: (data) => writeEmitter.fire(data),
    };

    const displayTerminal = vscode.window.createTerminal({
      name: `My Extension REPL`,
      pty,
    });

    displayTerminal.show();
  } catch (e) {
    console.log("error in handleTerminal: ", e);
  }
};

module.exports = {
  broadcastTerminal,
};
