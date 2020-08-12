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

const fullName = process.env.STROVE_USER_FULL_NAME || "Dranet";

const LOCATION_COLOR = "\033[0;34m";
const USER_COLOR = "\033[0;32m";

const NC = "\033[0m";

let CURRENT_LOCATION = "";

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
    return cwd;
  },
  initEvents: () => {
    // Handle Data
    terminal.process.stdout.on("data", (buffer) => {
      let response = buffer.toString("utf-8");
      response = response.split(/[\r\n\t]+/g);
      writeEmitter.fire(
        response.length > 1 ? response.join("\r\n") : response[0]
      );
      writeLocation();
      if (response.length > 2) response.pop();
      sendCommand(response.length > 1 ? response.join("\r\n") : response[0]);
      terminal.logger({ type: "data", data: buffer });
    });

    // Handle Error
    terminal.process.stderr.on("data", (buffer) => {
      let response = buffer.toString("utf-8");
      response = response.split(/[\r\n\t]+/g);
      writeEmitter.fire(
        response.length > 1 ? response.join("\r\n") : response[0]
      );
      writeLocation();
      if (response.length > 2) response.pop();
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
    // const location = checkLocation();

    // const locationString = `${USER_COLOR + "strove@" + fullName}:${
    //   LOCATION_COLOR + `~/${location}` + NC
    // }$ `;

    const broadcastTerminalOperation = {
      query: broadcastTerminalMutation,
      variables: {
        projectId: process.env.STROVE_PROJECT_ID || "123abc",
        command: command,
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
  // But those codes work for sure: https://www.novell.com/documentation/extend5/Docs/help/Composer/books/TelnetAppendixB.html
  try {
    terminal.initEvents();
    let line = "";
    const pty = {
      onDidWrite: writeEmitter.event,
      open: () => {
        writeEmitter.fire(
          "This terminal's window is being shared.\r\nPlease be sure to use it for any task related commands.\r\n"
        );
        sendCommand(getLocationString());
        writeLocation();
      },
      close: () => {
        /* noop */
      },
      handleInput: async (data) => {
        try {
          switch (data) {
            case "\r":
              // Enter
              writeEmitter.fire(`\r\n`);
              if (line && line.toString().length > 0) {
                terminal.send(line + "");
                sendCommand(getLocationString() + line);
              }
              const location = checkLocation();
              if (location !== CURRENT_LOCATION || line === "") {
                writeLocation();
                sendCommand(getLocationString());
              }

              line = "";
              break;
            case "\x7f":
              // Backspace
              if (line.length === 0) {
                return;
              }
              line = line.substr(0, line.length - 1);
              // Move cursor backward
              writeEmitter.fire("\x1b[D");
              // Delete character
              writeEmitter.fire("\x1b[P");
              break;
            case "\u001b[A":
            case "\u001b[B":
            case "\u0009":
            case "\u001bOP\u0009":
              // Necessary to disable up/down arrows and tab (it breaks backspace button)
              break;
            case "\u001b[C":
              writeEmitter.fire("\x1b[C");
              break;
            case "\u001b[D":
              writeEmitter.fire("\x1b[D");
              break;
            case "\u0003":
              writeEmitter.fire("^C\r\n");
              writeLocation();
              terminal.process.kill();
              break;
            default:
              line += data;
              writeEmitter.fire(data);
          }
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

const writeLocation = (location = checkLocation()) => {
  CURRENT_LOCATION = location;

  const locationString = `${USER_COLOR + "strove@" + fullName}:${
    LOCATION_COLOR + `~/${location}` + NC
  }$ `;

  writeEmitter.fire(locationString);

  return locationString;
};

const checkLocation = () => {
  // const locationString = "/home/strove/project/strove.io";
  const locationString = terminal.cwd();
  const locationArray = locationString.split("/");
  return locationArray[locationArray.length - 1];
};

const getLocationString = () => {
  const location = checkLocation();

  const locationString = `${USER_COLOR + "strove@" + fullName}:${
    LOCATION_COLOR + `~/${location}` + NC
  }$ `;

  return locationString;
};

module.exports = {
  broadcastTerminal,
};
