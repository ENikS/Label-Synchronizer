import { Application } from 'probot'
import { Octokit } from '@octokit/rest'
import { LabelEnumerator, LabelHookPayload, INodeInfo } from './labels'


export = (app: Application) => {

  app.on('label',  async (context) => {
    
    // Dismiss if called recursively
    if (context.isBot) return;

    // Parameters
    let payload = context.payload as LabelHookPayload;
    let login  = payload.organization.login;
    let source = payload.repository.name;
    let target = payload.changes?.name 
               ? payload.changes.name.from
               : payload.label.name;

    // Select and create action           
    var action = "deleted" == payload.action 

    ? // Delete labels action
    (info: INodeInfo) => {
      if (null != info.label) {

        let options: Octokit.IssuesDeleteLabelParams = {
          owner: login,
          repo: info.name,
          name: payload.label.name,
        };        

        context.github.issues.deleteLabel(options)
                             .catch((e: Octokit.HookError) => {
                               context.log.error(e)
                              });
      }
    } 

    : // Modify labels action
    async (info: INodeInfo) => {
      if (null == info.label) {

        // Create label

        let options: Octokit.IssuesCreateLabelParams = {
          owner: login,
          repo: info.name,
          name: payload.label.name,
          color: payload.label.color,
          description: (payload.label as any)['description']
        };

        context.github.issues.createLabel(options)
                             .catch((e: Octokit.HookError) => {

                               if (422 != e.status) {
                                 context.log.error(e);
                                 return;
                               }

                               // Resend as update request
                               let update = options as any;
                               update.current_name = options.name;
                               context.github.issues.updateLabel(update);
                              });

      } else {
        
        // Update label

        let options: Octokit.IssuesUpdateLabelParams = {
          owner: login,
          repo: info.name,
          current_name: target,
          name: payload.label.name,
          color: payload.label.color,
          description: (payload.label as any)['description']
        };

        context.github.issues.updateLabel(options)
                             .catch((e: Octokit.HookError) => {
                               context.log.error(e)
                              });
      }
    }
 
    // Process nodes
    for await (let node of LabelEnumerator(context.github, login, source, target)) action(node);
  })
}
