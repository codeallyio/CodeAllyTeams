const fs = require("fs");
const { transform } = require("camaro");

// Sentry.init({
//   beforeSend(event) \
//     if (environment === "production") {
//       return event;
//     }
//     return null;
//   },
//   dsn: "https://8acd5bf9eafc402b8666e9d55186f620@o221478.ingest.sentry.io/5285294",
//   maxValueLengthO: 1000,
//   normalizeDepth: 10,
// });

const getUnitTestResults = async () => {
  try {
    let junitTestData = fs.readFileSync(
      "C:/Users/User/.ssh/codeallyteam/test-results.xml",
      "utf-8"
    );
    let parsedOutput;
    const getParsedOutput = async (junitTestData) => {
      const result = await transform(junitTestData, {
        testsuites: [
          "/testsuites",
          {
            testsuite: [
              "/testsuites/testsuite",
              {
                testcase: [
                  "testcase",
                  {
                    name: "@name",
                    classname: "@classname",
                    time: "@time",
                    failure: ".",
                  },
                ],
                name: "@name",
                errors: "@errors",
                failures: "@failures",
                skipped: "@skipped",
                timestamp: "@timestamp",
                time: "@time",
                tests: "@tests",
              },
            ],
            name: "@name",
            tests: "@tests",
            failures: "@failures",
            errors: "@errors",
            time: "@time",
          },
        ],
      });
      return JSON.stringify(result, null, 2);
    };
    parsedOutput = await getParsedOutput(junitTestData);
    return parsedOutput;
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  getUnitTestResults,
};
