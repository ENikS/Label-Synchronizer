import { Application } from 'probot'
import { getAuthorizedRepositories } from './repositories'
import { CreateLabel, UpdateLabel, DeleteLabel } from './rest'


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

    // Get authorized GitHub API
    const label = context.payload.label;

      // Process each repository
    for await (const node of  getAuthorizedRepositories(app, context.payload)) {

      if (null == node.label) {
        
        // Create label
        CreateLabel(context.github, node, label);

      } else {
        
        // Update existing label
        UpdateLabel(context.github, node, node.label, label)  
      }
    }
  })


  /**
   ** Handles Label Edited event
   **/
  app.on("label.edited",  async (context) => {
        
    // Dismiss requests from any bot
    if (context.isBot) return; 

    // Get authorized GitHub API
    const label = context.payload.label;

      // Process each repository
    for await (const node of  getAuthorizedRepositories(app, context.payload)) {

      if (null == node.label) {
        
        // Create label
        CreateLabel(context.github, node, label);

      } else {
        
        // Update existing label
        UpdateLabel(context.github, node, node.label, label)  
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
    for await (const node of getAuthorizedRepositories(app, context.payload)) {

      if (null != node.label) {
        
        // Delete label
        DeleteLabel(context.github, node);
      }
    }
  })
}
