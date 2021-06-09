(() => {
  const vscode = acquireVsCodeApi();

  const { isSharingTerminalOpen } = vscode.getState();

  const sendInstruction = (instruction, data = {}) =>
    vscode.postMessage({ instruction, data });

  document.querySelector("#receive-button").addEventListener("click", () => {
    const userId = document.querySelector("#user-list").value;

    sendInstruction("start-receiving", { userId });
  });

  document.querySelector("#share-button").addEventListener("click", () => {
    if (isSharingTerminalOpen) {
      sendInstruction("restart-sharing");
    } else {
      sendInstruction("start-sharing");
      vscode.setState({ isSharingTerminalOpen: true });
      document.querySelector("#share-button").innerHTML =
        "Restart shared terminal";
    }
  });

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const { message, additionalData } = event.data; // The json data that the extension sent
    switch (message) {
      case "update-user-list": {
        let listData = "";
        Object.keys(additionalData).map((key) => {
          listData += `<option value="${key}">${additionalData[key].name}</option>`;
        });
        document.querySelector("#user-list").innerHTML = listData;
        break;
      }
      case "set-sharing-flag": {
        vscode.setState({ isSharingTerminalOpen: true });
        document.querySelector("#share-button").innerHTML =
          "Restart shared terminal";
        break;
      }
    }
  });
})();
