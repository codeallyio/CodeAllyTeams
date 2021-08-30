// const Sentry = require("@sentry/node");
// const environment = process.env.STROVE_ENVIRONMENT;
const parser = require("fast-xml-parser");
const he = require("he");
const fs = require("fs");
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
    // Formatting XML to JSON
    let options = {
      attributeNamePrefix: "@_",
      attrNodeName: "attr", //default is 'false'
      textNodeName: "#text",
      ignoreAttributes: true,
      ignoreNameSpace: false,
      allowBooleanAttributes: false,
      parseNodeValue: true,
      parseAttributeValue: false,
      trimValues: true,
      cdataTagName: "__cdata", //default is 'false'
      cdataPositionChar: "\\c",
      parseTrueNumberOnly: false,
      arrayMode: false, //"strict"
      attrValueProcessor: (val, attrName) =>
        he.decode(val, { isAttributeValue: true }), //default is a=>a
      tagValueProcessor: (val, tagName) => he.decode(val), //default is a=>a
      stopNodes: ["parse-me-as-string"],
    };

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
