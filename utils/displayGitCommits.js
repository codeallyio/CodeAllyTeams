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

const getCommits = async () => {
  let data;
  try {
    const { stdout } = await exec(`sudo git rev-list HEAD --timestamp`);
    data = stdout.toString().split(/[' ','\n']+/);
    let timestamps = [],
      commits = [];
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
    return [timestamps, commits];
  } catch (err) {
    console.log("error in getCommits: ", err);
  }
};

const commitDiff = async (i) => {
  const cData = await getCommits();
  const timestamps = cData[0];
  const commits = cData[1];
  const { stdout } = await exec(`sudo git diff ${commits[i]} ${commits[0]}`);
  const data = stdout.toString().split(/['+''\n']+/);
  let result = `
  <h4>Time of commit: ${timestamps[i]}</h4>
  <h5>Commit differences: </h5>
  `;
  for (let j = 0; j <= data.length - 1; j++) {
    result += `
    <div>${data[j]}</div>
    `;
  }
  return result;
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
      if (message.commitId) {
        let output = ``;
        (async () => {
          const diff = await commitDiff(message.commitId);
          output += `${diff}`;
          panel.webview.postMessage({
            commitData: output,
          });
        })();
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

const getGitCommits = async () => {
  const diff = await commitDiff(1);
  const firstCommit = `<div>${diff}</div>`;
  return `
  <!DOCTYPE html>
  <html>
  <head>
  <title>Commit history</title>
  <style>
  .head {
    display: flex;
    width: 100vw;
  }

  .btn {
    background-color: #ccc;
    padding: 5px 7px;
    margin: 20px;
    border-radius: 5px;
    border: none;
    height: 20px;
  }

  .btn next {
    float: right;
  }

  .btn prev {
    float: left;
  }

  </style>
  </head>
  <body>
  <div class="head">
  <button class="btn prev" id="prev">Previous</button>
	<h2>Git commits history</h2>
  <button class="btn next" id="next">Next</button>
  </div>
  <div id="commit">${firstCommit}</div>
  <script>
  let index = 0;
  (function() {
    const vscode = acquireVsCodeApi();
    document.getElementById('prev').addEventListener("click", function myFunction() {
      if (index === 0) {
        return;
      } else {
        index--;
        vscode.postMessage({
          commitId: index,
        });
      }
    });

    document.getElementById('next').addEventListener("click", function myFunction() {
      index++;
      vscode.postMessage({
        commitId: index,
      })
    });

    function changeCommitData(i) {
      const data = i;
      document.getElementById('commit').innerHTML = "haiya";
      document.getElementById('commit').innerHTML = data;
    }

    window.addEventListener('message', event => {
      const message = event.data;
      if(message.commitData) {
        changeCommitData(message.commitData);
      }
  });
  }());
  </script>
  </body>
  </html>
  `;
};

module.exports = {
  displayGitCommits,
};
