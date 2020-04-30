import { Application } from 'probot'
import { LabelEnumerator } from './repositories'
import { DeleteLabelAction as DeletedLabelAction, ModifiedLabelAction } from './labels'


export = (app: Application) => {
  
  app.on('label', async (context) => {
    
    // Dismiss requests from any bot
    if (context.isBot) return; 

    // Parameters
    const changes = (context.payload as any).changes
    const target = changes?.name
                 ? changes.name.from
                 : context.payload.label.name

    // Select and create action to perform
    var action = context.payload.action == 'deleted'
               ? DeletedLabelAction( context, context.payload.label.name)
               : ModifiedLabelAction(context, target);

    // Process all repositories
    for await (const node of LabelEnumerator(context, target)) action(node)
  })
}
