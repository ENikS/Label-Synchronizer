import { Application } from 'probot' // eslint-disable-line no-unused-vars

export = (app: Application) => {

  app.on('label',  async (context) => {
    const event = context.event;
    const org = context.repo.name;
    
    const action = context.payload.action;
    //const label = context.payload.label;
    //const changes = context.payload.changes;
    const changes = (context.payload as any)['changes'];
    const color = context.payload.label.color;
    //const description = context.payload.label.description;
    // id:1970269254
    const name = context.payload.label.name;
    // node_id:"MDU6TGFiZWwxOTcwMjY5MjU0"

    const getRepositories = `
      query getRepositories($login: String!, $cursor: String) {
        organization(login: $login) {
          repositories(first: 10, after: $cursor) {
            totalCount
            pageInfo {
              endCursor
              hasNextPage
              hasPreviousPage
              startCursor
            }
            nodes {
              name
            }
          }
        }
      }`

    try 
    {
      
      let variables = {
        "login": "unitycontainer",
        "cursor": null
      };

      let result = await context.github.graphql(getRepositories, variables);
      console.log(result);
    }
    catch(e)
    {
      console.log(e);
    }
  
    const repository = context.payload.repository;                  //: Object {id: 183472138, node_id: "MDEwOlJlcG9zaXRvcnkxODM0NzIxMzg=", name: "experimental", …}
    const organization = (context.payload as any)['organization'];  //: Object {login: "unitycontainer", id: 12849707, node_id: "MDEyOk9yZ2FuaXphdGlvbjEyODQ5NzA3", …}

    const issueComment = context.payload;
  })

  // context.payload
  // Object {action: "edited", label: Object, changes: Object, repository: Object, organization: Object, …}
  // action: "edited"
  // changes: Object {}
  // installation: Object {id: 8302263, node_id: "MDIzOkludGVncmF0aW9uSW5zdGFsbGF0aW9uODMwMjI2Mw=="}
  // label: Object {id: 1970269254, node_id: "MDU6TGFiZWwxOTcwMjY5MjU0", url: "https://api.github.com/repos/unitycontainer/experi…", …}
  // organization: Object {login: "unitycontainer", id: 12849707, node_id: "MDEyOk9yZ2FuaXphdGlvbjEyODQ5NzA3", …}
  // repository: Object {id: 183472138, node_id: "MDEwOlJlcG9zaXRvcnkxODM0NzIxMzg=", name: "experimental", …}
  // sender: Object {login: "ENikS", id: 1750155, node_id: "MDQ6VXNlcjE3NTAxNTU=", …}

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}

