const vscode = require("vscode");
const { execute } = require("apollo-link");

const { websocketLink } = require("./websocketLink");
const { watchActiveUsersSubscription } = require("./queries");
const { handleError } = require("./errorHandling");

let watchActiveUsersSubscriber = null;
const myId = process.env.CODEALLY_USER_ID || "123";

let ACTIVE_USERS_DATA = {};

const watchActiveUsersChange = async () => {
  try {
    const watchActiveUsersOperation = {
      query: watchActiveUsersSubscription,
      variables: {
        projectId: process.env.CODEALLY_ORIGINAL_PROJECT_ID || "123abc",
      },
    };

    watchActiveUsersSubscriber = execute(
      websocketLink,
      watchActiveUsersOperation
    ).subscribe({
      next: async (data) => {
        try {
          const {
            data: { watchActiveUsers },
          } = data;

          if (
            watchActiveUsers &&
            Array.isArray(watchActiveUsers) &&
            watchActiveUsers.length > 0
          ) {
            // In user:
            // id;
            // name;
            // fullName;
            // type;

            const allUsers = [
              ...new Set([
                ...Object.keys(ACTIVE_USERS_DATA),
                ...watchActiveUsers.map((newUser) => newUser.id),
              ]),
            ];

            allUsers.forEach((userId) => {
              // ActiveUSers is a list of other active users so we want to filter current user out
              // I return false just because I want to do nothing in this case
              if (userId === myId) return false;

              const user = watchActiveUsers.find(
                (activeUser) => activeUser.id === userId
              );

              if (user) {
                ACTIVE_USERS_DATA[userId] = watchActiveUsers.find(
                  (activeUser) => activeUser.id === userId
                );
              } else {
                delete ACTIVE_USERS_DATA[userId];
              }
            });

            vscode.commands.executeCommand("activeUsers.refresh");
          }
        } catch (error) {
          handleError({
            error,
            location: "watchActiveUsers -> watchActiveUsersSubscriber -> next",
            additionalData: watchActiveUsersOperation,
          });
        }
      },
      error: (error) =>
        handleError({
          error,
          location: "watchActiveUsers -> watchActiveUsersSubscriber -> error",
          additionalData: watchActiveUsersOperation,
        }),
      complete: () => console.log(`complete`),
    });
  } catch (error) {
    handleError({
      error,
      location: "watchActiveUsers -> watchActiveUsersChange",
    });
  }
};

module.exports = {
  watchActiveUsersChange,
  watchActiveUsersSubscriber,
};
