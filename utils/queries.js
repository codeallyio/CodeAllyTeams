const userDataFragment = `
    projectId
    userId
    fullName
    photoUrl
    documentPath
    selections {
        start {
            line
            character
        }
        end{
            line
            character
        }
        active{
            line
            character
        }
        anchor{
            line
            character
        }
    }
    color
`;

exports.stroveLiveshareSubscription = `
subscription($userId: String!, $projectId: String!) {
    stroveLiveshare (userId: $userId, projectId: $projectId) {
      ${userDataFragment}
    }
  }
`;

exports.liveshareActivity = `
mutation($userData: UserActivityInput) {
    liveshareActivity (userData: $userData)
}
`;

exports.focusEditorSubscription = `
subscription($projectId: String!) {
    focusEditor(projectId: $projectId) {
        documentPath
        selections {
            start {
                line
                character
            }
            end {
                line
                character
            }
        }
    }
}
`;

exports.receiveTerminalSubscription = `
subscription($projectId: String!) {
    receiveTerminal(projectId: $projectId)
}
`;

exports.setProjectDataMutation = `
mutation($id: ID!, $ioTestOutputs: [IOTestOutputs], $portStatus: PortStatus) {
    setProjectData(id: $id, ioTestOutputs: $ioTestOutputs, portStatus: $portStatus) {
        name
    }
}
`;

exports.receiveAutomaticTestSubscription = `
subscription($projectId: String!) {
    automaticTest(projectId: $projectId) {
            projectId
            userId
            folderName
            command
            testStartCommand    
    }
}
`;

exports.startIOTestMutation = `
subscription($projectId: String!) {
    startIOTest(projectId: $projectId) {
            language
            testCommand
            inputOutput {
                input {
                  type
                  value
                }
                output {
                  type
                  value
                }
            } 
    }
}
`;
