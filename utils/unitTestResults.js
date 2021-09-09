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

const getJSONReport = async (junitTestData) => {
  try {
    const result = await transform(junitTestData, {
      // testsuites: [
      //   "/testsuites",
      //   {
      testsuite: [
        "testsuite",
        {
          testcase: [
            "testcase",
            {
              name: "@name",
              classname: "@classname",
              time: "number(@time)",
              failure: ".",
              skipped: ".",
            },
          ],
          name: "@name",
          errors: "number(@errors)",
          failures: "@failures",
          skipped: "@skipped || @skip",
          timestamp: "@timestamp",
          time: "@time",
          tests: "@tests",
        },
      ],
      // },
      // ],
    });
    return JSON.stringify(result, null, 2);
  } catch (err) {
    handleError({
      err,
      location: "unitTestResults -> getJSONReport",
    });
  }
};

const parseTestData = async (junitTestData) => {
  try {
    let json = await getJSONReport(junitTestData);
    console.log(
      "🚀 ~ file: unitTestResults.js ~ line 64 ~ parseTestData ~ json",
      json
    );
    let junitTestReport = JSON.parse(json);
    console.log(
      "🚀 ~ file: unitTestResults.js ~ line 66 ~ parseTestData ~ junitTestReport",
      junitTestReport
    );
    // let test = junitTestReport.testsuites[0].testsuite[0];
    let test = junitTestReport.testsuite[0];
    console.log(
      "🚀 ~ file: unitTestResults.js ~ line 68 ~ parseTestData ~ test",
      test
    );
    let testResults = [];
    for (let i = 0; i < test.tests; i++) {
      testResults.push({
        name: test.testcase[i].classname,
        success: test.testcase[i].failure == "" ? true : false,
        receivedOutput: test.testcase[i].failure
          ? test.testcase[i].failure
          : test.testcase[i].name,
      });
    }
    let parsedTestData = {
      all: test.tests,
      passed: test.tests - test.failures,
      failed: test.failures,
      repoTestResults: testResults,
    };
    console.log(
      "🚀 ~ file: unitTestResults.js ~ line 85 ~ parseTestData ~ parsedTestData",
      parsedTestData
    );
    return parsedTestData;
  } catch (err) {
    handleError({
      err,
      location: "unitTestResults -> parseTestData",
    });
  }
};

const getUnitTestResults = async () => {
  try {
    let junitTestData = fs.readFileSync(
      `/home/codeally/project/${process.env.TEST_REPORT_PATH}` ||
        "/Users/mac/Desktop/SiliSky/gitTest/GitServerTesting/junit.xml",
      "utf-8"
    );
    console.log(
      "🚀 ~ file: unitTestResults.js ~ line 98 ~ getUnitTestResults ~ junitTestData",
      junitTestData
    );
    let testResult = await parseTestData(junitTestData);
    return await sendTestResultsData(testResult);
  } catch (err) {
    handleError({
      err,
      location: "unitTestResults -> getUnitTestResults",
    });
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
