import { Application } from 'probot'
import { DeleteLabelAction as DeletedLabelAction, ModifiedLabelAction } from './labels'
import { LabelEnumerator, LabelHookPayload } from './repositories'

export = (app: Application) => {
  app.on('label', async (context) => {
    
    if (context.isBot) return; // Dismiss if called recursively

    // Parameters
    const payload = context.payload as LabelHookPayload
    const login = payload.organization.login
    const target = payload.changes?.name
                 ? payload.changes.name.from
                 : payload.label.name

    // Select and create action to perform
    var action = payload.action == 'deleted'
               ? DeletedLabelAction(context, login, payload.label.name)
               : ModifiedLabelAction(context, login, target, payload.label);

    // Process all repositories
    for await (const node of LabelEnumerator(context, target)) action(node)
  })
}
