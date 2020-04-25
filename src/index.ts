import { Application } from 'probot'
import { LabelHookPayload } from './github-wrapper'
import { LabelEnumerator } from './labels'

export = (app: Application) => {

  app.on('label',  async (context) => {
    
    if (context.isBot) return;

    let payload = context.payload as LabelHookPayload;
    let login = payload.organization.login;
    let label = payload.changes?.name 
              ? payload.changes.name.from
              : payload.label.name;

    for await (let node of LabelEnumerator(context.github, login, label)) {
      
      console.log(node);

    }
  })
}

// context.payload
// Object {action: "edited", label: Object, changes: Object, repository: Object, organization: Object, …}
// action: "edited"
// changes: Object {name: Object}
// installation: Object {id: 8302263, node_id: "MDIzOkludGVncmF0aW9uSW5zdGFsbGF0aW9uODMwMjI2Mw=="}
// label: Object {id: 1970269254, node_id: "MDU6TGFiZWwxOTcwMjY5MjU0", url: "https://api.github.com/repos/unitycontainer/experi…", …}
// organization: Object {login: "unitycontainer", id: 12849707, node_id: "MDEyOk9yZ2FuaXphdGlvbjEyODQ5NzA3", …}
// repository: Object {id: 183472138, node_id: "MDEwOlJlcG9zaXRvcnkxODM0NzIxMzg=", name: "experimental", …}
// sender: Object {login: "ENikS", id: 1750155, node_id: "MDQ6VXNlcjE3NTAxNTU=", …}
