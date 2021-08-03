const vscode = require("vscode");
const path = require("path");
const Sentry = require("@sentry/node");
const util = require("util");
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

const commitDiff = async (i) => {
  try {
    const panel = vscode.window.createWebviewPanel(
      "html",
      "Commit differences",
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    const commitDifferences = await loadCommitDiff(i);

    panel.webview.html = commitDifferences;

    return panel;
  } catch (err) {
    console.log(
      `received error in webview -> commitDiff ${JSON.stringify(err)}`
    );

    sendLog(`received error in webview -> commitDiff ${JSON.stringify(err)}`);

    Sentry.withScope((scope) => {
      scope.setExtras({
        data: path,
        location: "webview -> commitDiff",
      });
      Sentry.captureException(err);
    });
  }
};

const loadCommitDiff = async (i) => {
  const cData = await getCommits();
  let second = cData[1];
  if (i != 0) {
    second = cData[i * 2 + 1];
  }
  const { stdout } = await exec(`sudo git diff ${second} ${cData[1]}`);
  const data = stdout.toString().split(/['+''\n']+/);
  let result = ``;
  for (let i = 0; i <= data.length; i++) {
    result += `
    <div>${data[i]}</div>
    `;
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
  <title>Commit differences</title>
  </head>
  <body>
  <h1>Commit differences</h1>
  <br>
  ${result}
  </body>
  </html>
  `;
};

const displayGitCommits = async () => {
  try {
    const panel = vscode.window.createWebviewPanel(
      "html",
      "Commit logs",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    const fileContent = await getGitCommits();

    panel.webview.onDidReceiveMessage((message) => {
      if (message.commit) {
        return commitDiff(message.commit);
      }
    });

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
    const { stdout } = await exec(`sudo git rev-list HEAD --timestamp`);
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
  // store data in 2 separate arrays
  const data = await getCommits();
  for (let i = 0; i < data.length; i++) {
    if (i % 2 === 0) {
      // convert timestamps to human-readable date format
      const milliseconds = data[i] * 1000;
      const dateObject = new Date(milliseconds);
      const humanDateFormat = dateObject.toLocaleString();
      timestamps.push(humanDateFormat);
    } else {
      commits.push(data[i]);
    }
  }
  let tableData = ``;
  for (let i = 0; i < timestamps.length - 1; i++) {
    tableData += `
      <tr>
        <td><p>${timestamps[i]}</p></td>
        <td id="${i}">${commits[i]}</td>
      </tr>
    `;
  }
  const cLength = commits.length;
  return `
  <!DOCTYPE html>
  <html>
  <head>
  <title>Commit history</title>
  </head>
  <body>
	<h1>Git commits history</h1>
  <table>
  <tr>
  <th>Timestamps</th>
  <th>Commits (click to see changes)</th>
  </tr>
  ${tableData}
  </table>
  <script>
  (function() {
    const vscode = acquireVsCodeApi();

    for(let i = 0; i < ${cLength}; i++) {
      document.getElementById(i).addEventListener("click", function myFunction() {
        vscode.postMessage({
          commit: i,
        })
      });
    }
}())
  </script>
  </body>
  </html>
  `;
};

displayGitCommits();

module.exports = {
  displayGitCommits,
  commitDiff,
};
