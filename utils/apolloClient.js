const { ApolloClient } = require('../node_modules/@apollo/client')
const { WebSocketLink } = require("apollo-link-ws");
const { InMemoryCache } = require('../node_modules/@apollo/client/cache');
const { websocketEndpoint } = require("./endpoints");
const fetch = require('node-fetch');
const ws = require("ws");

const cache = new InMemoryCache()

const link = new WebSocketLink({
  uri: websocketEndpoint,
  options: {
    reconnect: true,
    connectionParams: () => ({
      authorization: process.env.STROVE_USER_TOKEN
        ? `Bearer ${process.env.STROVE_USER_TOKEN}`
        : "",
    }),
  },
  webSocketImpl: ws
});

module.exports = {
  apolloClient: new ApolloClient({ fetch, link, cache }),
};