const vscode = require("vscode");
const path = require("path");
const Sentry = require("@sentry/node");
var util = require("util");
const exec = util.promisify(require("child_process").exec);
const { sendLog } = require("./debugger");
const environment = process.env.STROVE_ENVIRONMENT;

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

const displayGitCommits = async () => {
  try {
    const panel = vscode.window.createWebviewPanel(
      "html",
      vscode.ViewColumn.One,
      {}
    );
    const fileContent = await getGitCommits();

    panel.webview.html = fileContent;

    return panel;
  } catch (err) {
    console.log(
      `received error in webview -> displayGitCommits ${JSON.stringify(err)}`
    );

    sendLog(
      `received error in webview -> displayGitCommits ${JSON.stringify(err)}`
    );

    Sentry.withScope((scope) => {
      scope.setExtras({
        data: path,
        location: "webview -> displayGitCommits",
      });
      Sentry.captureException(err);
    });
  }
};

const getCommits = async () => {
  let data;
  try {
    const { stdout } = await exec(
      `cd ../../../../.ssh/codeallyteam && git rev-list HEAD --timestamp`
    );
    data = stdout.toString().split(/[' ','\n']+/);
    return data;
  } catch (err) {
    console.log("error in getCommits: ", err);
    // Sentry.withScope((scope) => {
    //   scope.setExtras(
    //     data: { error: err },
    //     location: "getCommits",
    //   });
    //   Sentry.captureMessage("Unexpected error!");
    // });
  }
};

const getGitCommits = async () => {
  let timestamps = [];
  let commits = [];
  const data = await getCommits();
  for (var i = 0; i < data.length; i++) {
    if (i % 2 === 0) {
      timestamps.push(data[i]);
    } else {
      commits.push(data[i]);
    }
  }
  return `
  <!DOCTYPE html>
  <html>
  <head>
  <title>Commit history</title>
  </head>
  <body>
	<h1>Git commits history</h1>
  <p>Timestamps: ${timestamps}</p>
  <p>Commit logs: ${commits}</p>
  </body>
  </html>
  `;
};

displayGitCommits();

module.exports = {
  displayGitCommits,
};
