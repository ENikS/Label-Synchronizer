import { Application } from 'probot'
import { LabelEnumerator, LabelHookPayload } from './repositories'
import { DeleteLabelAction as DeletedLabelAction, ModifiedLabelAction } from './labels'

export = (app: Application) => {
 
  app.on('label', async (context) => {

    // Dismiss requests from any bot
    if (context.isBot) return; 
    

    // Parameters
    const payload = context.payload as LabelHookPayload
    const login  = payload.organization.login
    const target = payload.changes?.name
                 ? payload.changes.name.from
                 : payload.label.name

    // Select and create action to perform
    var action = payload.action == 'deleted'
               ? DeletedLabelAction( context, login, payload.label.name)
               : ModifiedLabelAction(context, login, target, payload.label);

    // Process all repositories
    for await (const node of LabelEnumerator(context, target)) action(node)
  })
}
