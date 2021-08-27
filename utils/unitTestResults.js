// const Sentry = require("@sentry/node");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
// const environment = process.env.STROVE_ENVIRONMENT;
const builder = require("xmlbuilder");
const parser = require("fast-xml-parser");
var he = require("he");

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
    let passing,
      failing = "0  failing";
    const { stdout } = await exec(`cd ../../../../.ssh/codeallyteam && mocha`);
    let output = stdout.split("\n");
    let data = [];
    for (let i = 3; i < output.length; i++) {
      if (output[i].includes(") Array")) {
        break;
      } else if (String(output[i]).includes("passing")) {
        passing = output[i];
        failing = output[i + 1] ? output[i + 1] : failing;
        break;
      }
      if (output[i] == undefined || output[i] == " ") {
        i++;
      }
      data.push(output[i]);
    }

    // save in xml
    let xmlData = builder.create("root");
    for (let i = 0; i < data.length; i += 2) {
      xmlData.ele("test", { type: "String" }, `${data[i]}`);
      xmlData.ele("result", { type: "String" }, `${data[i + 1]}`);
      if (String(data[i + 1]).includes("√")) {
        xmlData.ele("passed", { type: "Boolean" }, true);
      } else {
        xmlData.ele("passed", { type: "Boolean" }, false);
      }
    }
    xmlData.ele("passedTests", { type: "String" }, `${passing}`);
    xmlData.ele("failedTests", { type: "String" }, `${failing}`);
    let unitTestData = xmlData.end({ pretty: true });

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

    let jsonObj;
    try {
      jsonObj = parser.parse(unitTestData, options, true);
    } catch (error) {
      console.log(error.message);
    }
    console.log(jsonObj);
    return jsonObj;
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  getUnitTestResults,
};
