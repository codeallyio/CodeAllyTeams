const vscode = require("vscode");
const util = require("util");
// const exec = util.promisify(require("child_process").exec);
const exec = require("child_process").exec;

// const testTerminal = (context) => {
//   const terminal = vscode.window.createTerminal({
//     name: `My Extension REPL`,
//   });
//   terminal.show();
// };

const testTerminal = (context) => {
  console.log("before try");
  try {
    console.log("in try");
    const writeEmitter = new vscode.EventEmitter();
    let line = "";
    const pty = {
      onDidWrite: writeEmitter.event,
      open: () =>
        writeEmitter.fire("Type and press enter to echo the text\r\n\r\n"),
      close: () => {
        /* noop*/
      },
      handleInput: async (data) => {
        try {
          if (data === "\r") {
            // Enter
            writeEmitter.fire(`\r\necho: "${colorText(line)}"\r\n\n`);
            // const response = await exec(
            //   `${line}`,
            //   { shell: true },
            //   (_, stdout) => console.log(stdout)
            // );

            // const { stdout, stderr } = response;
            // console.log(stdout);
            // console.log(JSON.stringify(stdout));

            // writeEmitter.fire(stdout);
            // writeEmitter.fire("dickbutt");

            // writeEmitter.fire(
            //   `\r${JSON.stringify(stdout || "") || stderr}\r\n\n`
            // );

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
          // if (data && typeof data === "string" && data.match(/[A-Z][a-z][0-9]/g))
          line += data;
          writeEmitter.fire(data);
        } catch (e) {
          console.log("error in handleTerminal -> handleInput: ", e);
        }
      },
      //   handleInput: (data) => writeEmitter.fire(data),
    };
    const terminal = vscode.window.createTerminal({
      name: `My Extension REPL`,
      pty,
    });
    terminal.show();

    console.log(terminal);
    // context.subscriptions.push(
    //   vscode.commands.registerCommand("extensionTerminalSample.clear", () => {
    //     writeEmitter.fire("\x1b[2J\x1b[3J\x1b[;H");
    //   })
    // );
  } catch (e) {
    console.log("error in handleTerminal: ", e);
  }
};

const colorText = (text) => {
  let output = "";
  let colorIndex = 1;
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    if (char === " " || char === "\r" || char === "\n") {
      output += char;
    } else {
      output += `\x1b[3${colorIndex++}m${text.charAt(i)}\x1b[0m`;
      if (colorIndex > 6) {
        colorIndex = 1;
      }
    }
  }
  return output;
};

module.exports = {
  testTerminal,
};
