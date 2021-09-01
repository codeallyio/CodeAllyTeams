const fs = require("fs");
const { transform } = require("camaro");
const { handleError } = require("./errorHandling");
const { sendLog } = require("./debugger");
const { setProjectDataMutation } = require("./queries");
const { execute, makePromise } = require("apollo-link");
const { websocketLink } = require("./websocketLink");

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
    let unitTestData = fs.readFileSync(
      process.env.TEST_REPORT_PATH ||
        "/Users/mac/Desktop/SiliSky/gitTest/GitServerTesting/junit.xml",
      "utf-8"
    );
    let jsonObj;
    try {
      jsonObj = parser.parse(unitTestData, options, true);
    } catch (error) {
      console.log(error.message);
    }
    return jsonObj;
  } catch (err) {
    console.log(err);
  }
};

const sendTestResultsData = async (parsedTestData) => {
  try {
    const setProjectData = {
      query: setProjectDataMutation,
      variables: {
        id: process.env.CODEALLY_ORIGINAL_PROJECT_ID || "123abc",
        repoTestReport: parsedTestData,
        // Expected data structure in parsedTestData:
        // repoTestReport: {
        //   all: Number,
        //   passed: Number,
        //   failed: Number,
        //   repoTestResults: [
        //     {
        //       name: String,
        //       success: Boolean,
        //       receivedOutput: String,
        //     },
        //   ],
        // },
      },
    };

    sendLog(`sendTestResultsData - variables: ${setProjectData.variables}`);

    makePromise(execute(websocketLink, setProjectData))
      .then()
      .catch((error) => {
        handleError({
          error,
          location: "unitTestResults -> sendTestResultsData -> mutation",
        });
      });
  } catch (error) {
    handleError({
      error,
      location: "unitTestResults -> sendTestResultsData",
    });
  }
};

module.exports = {
  getUnitTestResults,
};
