const vscode = require("vscode");
const child_process = require("child_process");
const fs = require("fs");

// Create emitter for pseudoterminal
const writeEmitter = new vscode.EventEmitter();

// Create Interface
const terminal = {
  terminalProcess: child_process.spawn("/bin/bash"),
  logger: (output) => {
    let data = "";
    if (output.data) data += ": " + output.data.toString();
    console.log(output.type + data);
  },
  send: (data) => {
    terminal.terminalProcess.stdin.write(data + "\n");
  },
  // Test it later as it doesn't work on mac but appears to be working on Ubuntu
  cwd: () => {
    let cwd = fs.readlinkSync("/proc/" + terminal.terminalProcess.pid + "/cwd");
    terminal.logger({ type: "cwd", data: cwd });
  },
};

// Handle Data
terminal.terminalProcess.stdout.on("data", (buffer) => {
  writeEmitter.fire(`\r\n${buffer}\r\n\n`);
  terminal.logger({ type: "data", data: buffer });
});

// Handle Error
terminal.terminalProcess.stderr.on("data", (buffer) => {
  terminal.logger({ type: "error", data: buffer });
});

// Handle Closure
terminal.terminalProcess.on("close", () => {
  terminal.logger({ type: "closure", data: null });
});

//   testingTerminal.send("echo Hello World!");

//   // testingTerminal.cwd();
//   testingTerminal.send("pwd");

//   await testingTerminal.send(
//     "cd /Users/mac/Desktop/SiliSky/api/siliskyApi && yarn"
//   );

//   testingTerminal.send("pwd");

//   console.log(testingTerminal.terminal);

const testTerminal = (context) => {
  console.log("before try");
  try {
    console.log("in try");
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
            writeEmitter.fire(`\r\n\r\n\n`);
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

    console.log(displayTerminal);
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
