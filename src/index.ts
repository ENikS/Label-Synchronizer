import { Application } from 'probot'
import { DeleteLabelAction, ModifiedLabelAction } from './labels'
import { LabelEnumerator, LabelHookPayload } from './repositories'

export = (app: Application) => {
  app.on('label', async (context) => {
    // Dismiss if called recursively
    if (context.isBot) return

    // Parameters
    const payload = context.payload as LabelHookPayload
    const login = payload.organization.login
    const target = payload.changes?.name
                 ? payload.changes.name.from
                 : payload.label.name

    // Select and create action
    var action = payload.action == 'deleted'
               ? DeleteLabelAction(context, login, payload.label.name)
               : ModifiedLabelAction(context, login, target, payload.label);

    // Process nodes
    for await (const node of LabelEnumerator(context, target)) action(node)
  })
}
