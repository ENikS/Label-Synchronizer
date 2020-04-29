import { Context } from 'probot'
import { Octokit } from '@octokit/rest'
import { WebhookPayloadLabel } from '@octokit/webhooks'
import { INodeInfo, LabelHookPayload } from './repositories'

export function DeleteLabelAction(context: Context<WebhookPayloadLabel>, name: string) : (info: INodeInfo) => void {

  const login = (context.payload as LabelHookPayload).organization.login;

  return (info: INodeInfo) => {
    
    if (null == info.label) return;

    const options: Octokit.IssuesDeleteLabelParams = {
      owner: login,
      repo: info.name,
      name: name
    }

    context.github.issues
                  .deleteLabel(options)
                  .catch((e: Octokit.HookError) => {
                    context.log.error(e)
                  })
  }
}

export function ModifiedLabelAction(context: Context<WebhookPayloadLabel>, name: string) : (info: INodeInfo) => void {

  const login             =  (context.payload as LabelHookPayload).organization.login;
  const label_name        =  (context.payload as LabelHookPayload).label.name;
  const label_color       =  (context.payload as LabelHookPayload).label.color;
  const label_description = ((context.payload as LabelHookPayload).label as any).description;

  return (info: INodeInfo) => {
    if (info.label == null) {
      
      // Create label
      const options: Octokit.IssuesCreateLabelParams = {
        owner: login,
        repo:  info.name,
        name:  label_name,
        color: label_color,
        description: label_description
      }

      context.github.issues
                    .createLabel(options)
                    .catch((e: Octokit.HookError) => {
                      if (e.status != 422) {
                        context.log.error(e)
                        return
                      }

                      // Resend as update request
                      const update = options as any
                      update.current_name = options.name
                      context.github.issues
                                    .updateLabel(update)                        
                                    .catch((e: Octokit.HookError) => {
                                      context.log.error(e)
                                    })
                    })
      } else {
        
        // Update label
      const options: Octokit.IssuesUpdateLabelParams = {
        owner: login,
        repo: info.name,
        current_name: name,
        name:  label_name,
        color: label_color,
        description: label_description
      }

      context.github.issues
                    .updateLabel(options)
                    .catch((e: Octokit.HookError) => {
                      context.log.error(e)
                    })
      }
    }
}
