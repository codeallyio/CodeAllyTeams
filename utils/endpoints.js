const environment = process.env.CODEALLY_ENVIRONMENT;

let endpoint;
let websocketEndpoint;
let idleTimeout = process.env.CODEALLY_IDLE_TIMEOUT;

if (environment === "local" || !environment) {
  idleTimeout = 5000;
  endpoint = "http://localhost:4040";
  websocketEndpoint = "ws://localhost:4040/graphql";
} else if (environment === "development") {
  endpoint = "https://graphql.codeally.io/api";
  websocketEndpoint = "wss://graphql.codeally.io/api/graphql";
} else if (environment === "testing") {
  endpoint = "https://testingapi.codeally.io/api";
  websocketEndpoint = "wss://testingapi.codeally.io/api/graphql";
} else {
  endpoint = "https://api.codeally.io/api/graphql";
  websocketEndpoint = "wss://api.codeally.io/api/graphql";
}

const liveshareActivityEndpoint = `${endpoint}/liveshareActivity`;
const graphqlEndpoint = `${endpoint}/graphql`;

module.exports = {
  graphqlEndpoint,
  liveshareActivityEndpoint,
  websocketEndpoint,
  idleTimeout,
};
