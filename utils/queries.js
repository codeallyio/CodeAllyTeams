exports.stroveLiveshareSubscription = `
subscription($id: String!) {
    stroveLiveshare (id: $id) {
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
    }
  }
`;
