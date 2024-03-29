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

exports.setProjectDataMutation = `
mutation($id: ID!, $ioTestOutputs: [IOTestOutputs], $portStatus: PortStatus, $currentIOLanguage: String, $repoTestReport: RepoTestReportInput) {
    setProjectData(id: $id, ioTestOutputs: $ioTestOutputs, portStatus: $portStatus, currentIOLanguage: $currentIOLanguage, repoTestReport: $repoTestReport) {
        name
    }
}
`;

exports.extensionInitializedMutation = `
mutation($currentProjectId: ID!, $originalProjectId: ID!) {
    extensionInitialized(currentProjectId: $currentProjectId, originalProjectId: $originalProjectId)
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
            createdFromFile
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

exports.resetIOTaskSubscription = `
subscription($projectId: String!) {
    resetIOTask(projectId: $projectId) {
            language
            fileContent
    }
}
`;

exports.watchActiveUsersSubscription = `
subscription($projectId: ID!) {
    watchActiveUsers(projectId: $projectId) {
            id
            name
            fullName
            type
    }
}
`;
