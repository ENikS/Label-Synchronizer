import { Application } from 'probot'
import { IWebhookPayloadLabel } from './typings'
import { CreateLabel, UpdateLabel, DeleteLabel } from './rest'
import { getChangeCandidates, getRenameCandidates } from './repositories'


// Subscribe to label events
export = (app: Application) => {

  // Setup authentication
  // const jwtTokenTTL = parseInt(process.env.JWT_TOKEN_TTL || '540', 10);
  // app.cache.wrap("app.auth()", () => app.auth(), { ttl: jwtTokenTTL })

  // Marketplace events
  app.on("marketplace_purchase", async (context) => {
    context.log(context);
  })


  /**
   ** Handles Label Created event
   **/
  app.on("label.created", async (context) => {
        
    // Dismiss requests from any bot
    if (context.isBot) return; 

      // Process each repository
    for await (const node of  getChangeCandidates(app, context.payload)) {

      if (null == node.label) {
        
        // Create label
        CreateLabel(context.github, node, context.payload.label);

      } else {
        
        // Update existing label
        UpdateLabel(context.github, node, context.payload.label)  
      }
    }
  })


  /**
   ** Handles Label Deleted event
   **/
  app.on("label.deleted", async (context) => {
    // Dismiss requests from any bot
    if (context.isBot) return; 

    // Process each repository
    for await (const node of getChangeCandidates(app, context.payload)) {

      if (null != node.label) {
        
        // Delete label
        DeleteLabel(context.github, node);
      }
    }
  })


  /**
   ** Handles Label Edited event
   **/
  app.on("label.edited",  async (context) => {
        
    // Dismiss requests from any bot
    if (context.isBot) return; 

    // When label is renamed, it requires checks for new and old
    // name so it is split in two possible cases here
    if ((context.payload as IWebhookPayloadLabel).changes.name) {
      
      // Process changes in the name
      for await (const node of  getRenameCandidates(app, context.payload)) {
        
        if (node.original) {
          // The repository has labels that match both names
          
          // Update one
          UpdateLabel(context.github, node, context.payload.label)  

          // Delete the other
          node.label = node.original;
          DeleteLabel(context.github, node);

        } else if (node.label) {

          // Only one matching label, simple update
          UpdateLabel(context.github, node, context.payload.label)  

        } else {
          
          // No matching labels, create a new label
          CreateLabel(context.github, node, context.payload.label);

        }
      }

    } else {

      // Process changes in color or description
      for await (const node of  getChangeCandidates(app, context.payload)) {

        if (null == node.label) {
          
          // No matching labels, create a new label
          CreateLabel(context.github, node, context.payload.label);
  
        } else {
          
          // Update existing label
          UpdateLabel(context.github, node, context.payload.label)  
        }
      }
    }
  })
}
