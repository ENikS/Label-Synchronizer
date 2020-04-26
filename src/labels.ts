import { Context } from 'probot'
import { Octokit } from '@octokit/rest'
import { WebhookPayloadLabelLabel, WebhookPayloadLabel } from '@octokit/webhooks'
import { INodeInfo } from './repositories'

export function DeleteLabelAction(context: Context<WebhookPayloadLabel>, login: string, name: string) : (info: INodeInfo) => void {
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

export function ModifiedLabelAction(context: Context<WebhookPayloadLabel>, login: string, name: string, label: WebhookPayloadLabelLabel) : (info: INodeInfo) => void {
  return (info: INodeInfo) => {
    if (info.label == null) {
      // Create label

        const options: Octokit.IssuesCreateLabelParams = {
          owner: login,
          repo: info.name,
          name: label.name,
          color: label.color,
          description: (label as any).description
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
          name: label.name,
          color: label.color,
          description: (label as any).description
        }

        context.github.issues
                      .updateLabel(options)
                      .catch((e: Octokit.HookError) => {
                        context.log.error(e)
                      })
      }
    }
}
