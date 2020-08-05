const vscode = require("vscode");
const child_process = require("child_process");
const fs = require("fs");
const { websocketLink } = require("./websocketLink");
const { execute, makePromise } = require("apollo-link");
const Sentry = require("@sentry/node");

const { broadcastTerminalMutation } = require("./queries");

// Create emitter for pseudoterminal
const writeEmitter = new vscode.EventEmitter();

const environment = process.env.STROVE_ENVIRONMENT;

Sentry.init({
  beforeSend(event) {
    if (environment === "production") {
      return event;
    }
    return null;
  },
  dsn:
    "https://8acd5bf9eafc402b8666e9d55186f620@o221478.ingest.sentry.io/5285294",
  maxValueLength: 1000,
  normalizeDepth: 10,
});

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
      sendCommand(response.length > 1 ? response.join("\r\n") : response[0]);
      terminal.logger({ type: "data", data: buffer });
    });

    // Handle Error
    terminal.process.stderr.on("data", (buffer) => {
      let response = buffer.toString("utf-8");
      response = response.split(/[\r\n\t]+/g);
      response.forEach((t) => writeEmitter.fire(`${t}\r\n`));
      sendCommand(response.length > 1 ? response.join("\r\n") : response[0]);
      terminal.logger({ type: "error", data: buffer });
    });

    // Handle Closure
    terminal.process.on("close", () => {
      terminal.process = child_process.spawn("/bin/sh");
      terminal.initEvents();
      terminal.logger({ type: "closure", data: null });
    });
  },
};

const sendCommand = async (command) => {
  try {
    const broadcastTerminalOperation = {
      query: broadcastTerminalMutation,
      variables: {
        projectId: process.env.STROVE_PROJECT_ID || "123abc",
        command,
      },
    };

    makePromise(execute(websocketLink, broadcastTerminalOperation))
      .then()
      .catch((error) => {
        console.log(`received error in sendCommand ${JSON.stringify(error)}`);

        Sentry.withScope((scope) => {
          scope.setExtras({
            data: broadcastTerminalOperation,
            location: "sendCommand -> mutation",
          });
          Sentry.captureException(error);
        });
      });
  } catch (e) {
    console.log("error in sendCommand: ", e);
    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { error: e },
        location: "sendCommand",
      });
      Sentry.captureMessage("Unexpected error!");
    });
  }
};

const broadcastTerminal = async () => {
  // const arrows = ["\u001b[C", "\u001b[B", "\u001b[D", "\u001b[A"];
  // Get hex codes from here if necessary: https://www.codetable.net/Group/arrows  -  may be usefull for ubuntu
  try {
    terminal.initEvents();
    let line = "";
    const pty = {
      onDidWrite: writeEmitter.event,
      open: () => {
        writeEmitter.fire(
          "This terminal's window is being shared.\r\nPlease be sure to use it for any task related commands.\r\n\r\n"
        );
      },
      close: () => {
        /* noop */
      },
      handleInput: async (data) => {
        try {
          if (data === "\r") {
            // Enter
            writeEmitter.fire(`\r\n\r\n`);
            if (line && line.toString().length > 0) {
              terminal.send(line + "");
              sendCommand(line);
            }

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
          }
          if (data === "\u001b[C") {
            writeEmitter.fire("\x1b[C");
            return;
          }
          if (data === "\u001b[D") {
            writeEmitter.fire("\x1b[D");
            return;
          }

          // console.log(JSON.stringify(data));
          console.log("line", JSON.stringify(line));
          line += data;
          console.log("line += data", JSON.stringify(line));
          writeEmitter.fire(data);
        } catch (e) {
          console.log("error in handleTerminal -> handleInput: ", e);
          Sentry.withScope((scope) => {
            scope.setExtras({
              data: { error: e },
              location: "handleTerminal -> handleInput",
            });
            Sentry.captureMessage("Unexpected error!");
          });
        }
      },
    };

    const displayTerminal = vscode.window.createTerminal({
      name: `Shared terminal`,
      pty,
    });

    displayTerminal.show();
  } catch (e) {
    console.log("error in handleTerminal: ", e);
    Sentry.withScope((scope) => {
      scope.setExtras({
        data: { error: e },
        location: "broadcastTerminal",
      });
      Sentry.captureMessage("Unexpected error!");
    });
  }
};

module.exports = {
  broadcastTerminal,
};
