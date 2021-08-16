const Sentry = require("@sentry/node");
var util = require("util");
const exec = util.promisify(require("child_process").exec);

// Sentry.init({
//   beforeSend(event) {
//     if (environment === "production") {
//       return event;
//     }
//     return null;
//   },
//   dsn: "https://8acd5bf9eafc402b8666e9d55186f620@o221478.ingest.sentry.io/5285294",
//   maxValueLength: 1000,
//   normalizeDepth: 10,
// });

const automateCommits = async () => {
  try {
    let commit;
    try {
      commit = await exec(`git add . && git commit -m "Automated Commit"`);
      console.log(commit);
    } catch (err) {
      commit = null;
      console.log(err, "In automateCommits");
      Sentry.captureMessage(`First error: ${err}`);
    }
  } catch (err) {
    console.log("error in automateCommits: ", err);
    // Sentry.withScope((scope) => {
    //   scope.setExtras({
    //     data: { error: e },
    //     location: "automateCommits",
    //   });
    //   Sentry.captureMessage("Unexpected error!");
    // });
  }
};

automateCommits();

module.exports = {
  automateCommits,
};
