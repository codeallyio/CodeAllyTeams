const vscode = require("vscode");
const child_process = require("child_process");
const fs = require("fs");

// Create emitters for pseudoterminal
const writeEmitter = new vscode.EventEmitter();

// Create Interface
const terminal = {
  process: child_process.spawn("/bin/sh"),
  logger: (output) => {
    let data = "";
    if (output.data) data += ": " + output.data.toString();
    console.log(output.type + data);
  },
  send: (data) => {
    terminal.process.stdin.write(data + "\n");
  },
  // Test it later as it doesn't work on macOS but appears to be working on Ubuntu
  cwd: () => {
    let cwd = fs.readlinkSync("/proc/" + terminal.process.pid + "/cwd");
    terminal.logger({ type: "cwd", data: cwd });
  },
  initEvents: () => {
    // Handle Data
    terminal.process.stdout.on("data", (buffer) => {
      let response = buffer.toString("utf-8");
      response = response.split(/[\r\n\t]+/g);
      response.forEach((t) => writeEmitter.fire(`${t}\r\n`));
      terminal.logger({ type: "data", data: buffer });
    });

    // Handle Error
    terminal.process.stderr.on("data", (buffer) => {
      let response = buffer.toString("utf-8");
      response = response.split(/[\r\n\t]+/g);
      response.forEach((t) => writeEmitter.fire(`${t}\r\n`));
      terminal.logger({ type: "error", data: buffer });
    });

    // Handle Closure
    terminal.process.on("close", () => {
      writeEmitter.fire(`Terminal process stopped!\r\n\r\n`);
      terminal.process = child_process.spawn("/bin/sh");
      terminal.initEvents();
      terminal.logger({ type: "closure", data: null });
    });
  },
};

module.exports = {
  terminal,
  writeEmitter,
};
