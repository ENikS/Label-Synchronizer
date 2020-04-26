import { Application } from 'probot'
import { Octokit } from '@octokit/rest'
import { LabelEnumerator, LabelHookPayload, INodeInfo } from './labels'

export = (app: Application) => {
  app.on('label', async (context) => {
    // Dismiss if called recursively
    if (context.isBot) return

    // Parameters
    const payload = context.payload as LabelHookPayload
    const login = payload.organization.login
    const source = payload.repository.name
    const target = payload.changes?.name
      ? payload.changes.name.from
      : payload.label.name

    // Select and create action
    var action = payload.action == 'deleted'

      ? // Delete labels action
      (info: INodeInfo) => {
        if (info.label != null) {
          const options: Octokit.IssuesDeleteLabelParams = {
            owner: login,
            repo: info.name,
            name: payload.label.name
          }

          context.github.issues.deleteLabel(options)
            .catch((e: Octokit.HookError) => {
              context.log.error(e)
            })
        }
      }

      : // Modify labels action
      async (info: INodeInfo) => {
        if (info.label == null) {
        // Create label

          const options: Octokit.IssuesCreateLabelParams = {
            owner: login,
            repo: info.name,
            name: payload.label.name,
            color: payload.label.color,
            description: (payload.label as any).description
          }

          context.github.issues.createLabel(options)
            .catch((e: Octokit.HookError) => {
              if (e.status != 422) {
                context.log.error(e)
                return
              }

              // Resend as update request
              const update = options as any
              update.current_name = options.name
              context.github.issues.updateLabel(update)
            })
        } else {
        // Update label

          const options: Octokit.IssuesUpdateLabelParams = {
            owner: login,
            repo: info.name,
            current_name: target,
            name: payload.label.name,
            color: payload.label.color,
            description: (payload.label as any).description
          }

          context.github.issues.updateLabel(options)
            .catch((e: Octokit.HookError) => {
              context.log.error(e)
            })
        }
      }

    // Process nodes
    for await (const node of LabelEnumerator(context.github, login, source, target)) action(node)
  })
}
