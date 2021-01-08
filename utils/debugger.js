const vscode = require('vscode')
const writeEmitter = new vscode.EventEmitter()

let debugMode = false

const startDebugging = () => {
  const pty = {
    onDidWrite: writeEmitter.event,
    open: () => {
      writeEmitter.fire(
        'Welcome to stroveTeams debugger!\n\rAll defined logs will appear here.\n\r'
      )
      debugMode = true
    },
    close: () => {
      debugMode = false
    },
    handleInput: () => {
      // disabling inputs
      return
    },
  }

  const debugTerminal = vscode.window.createTerminal({
    name: 'stroveTeams debugger',
    pty,
  })

  debugTerminal.show()
}

const sendLog = (log) => {
  setTimeout(() => {
    if (debugMode) {
      const stringifiedLog = JSON.stringify(log, (key, value) =>
        value instanceof Error ? value.message : value
      )

      writeEmitter.fire(stringifiedLog)
      writeEmitter.fire(`\n\r`)
    }
  }, 5000)
}

module.exports = {
  startDebugging,
  sendLog,
}
