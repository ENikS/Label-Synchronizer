import { Application, Context } from 'probot'
import { WebhookPayloadLabel } from '@octokit/webhooks'


export async function GetPlanName(app: Application, context: Context<WebhookPayloadLabel>) {
  try {
    let id = (context.payload as any).organization 
           ? (context.payload as any).organization.id
           : context.payload.sender.id;

    const github = await app.auth()
    const response = await github.request(`GET /marketplace_listing/accounts/${id}`);
    return response.data.marketplace_purchase.plan.name;
    
  } catch(e) {
    return "Free";
  }
}