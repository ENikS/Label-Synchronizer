import { Application } from 'probot'
import { LabelEnumerator, LabelHookPayload } from './repositories'
import { DeleteLabelAction as DeletedLabelAction, ModifiedLabelAction } from './labels'

var botLoginName: string;

export = (app: Application) => {
 
  app.on('label', async (context) => {
    context.log.trace(`Received event ${context.event} from ${context.payload.sender.login}`);

    // Get login info of the bot
    if (!botLoginName) {
      context.log.trace(`Querying for bot login name`);
      
      const botUser = await context.github.query(`{ viewer { login } }`);
      botLoginName = botUser?.viewer.login;

      context.log.trace(`Bot logged as ${botLoginName}`);
    }

    // Dismiss if called recursively 
    if (context.isBot && context.payload.sender.login == botLoginName) {
      context.log.trace(`Recursive call, dismissing`);
      return; 
    }

    // Parameters
    const payload = context.payload as LabelHookPayload
    const login  = payload.organization.login
    const target = payload.changes?.name
                 ? payload.changes.name.from
                 : payload.label.name
                 
    context.log.trace(`Organization: ${login}, Label: ${target}`);

    // Select and create action to perform
    var action = payload.action == 'deleted'
               ? DeletedLabelAction( context, login, payload.label.name)
               : ModifiedLabelAction(context, login, target, payload.label);

    // Process all repositories
    for await (const node of LabelEnumerator(context, target)) action(node)
  })
}
