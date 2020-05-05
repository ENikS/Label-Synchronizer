import { Octokit, Application } from 'probot'
import { IWebhookPayloadLabel } from './typings';

var exemptions = GetExemptions();


function GetExemptions() : Set<string> {
  let set = new Set<string>();
  let data =  require("../exemptions.json");
  
  for (let exemption of data.exemptions) {
      set.add(exemption.name);
  }

  return set;
}


export class MarketplacePlan {

  constructor(plan?: any) {

    if (plan) {
    
      // Settings for existing plan
      this.name = plan.name;
      this.ignorePrivate = true;

      // Include private repositories
      for (let bullet of plan.bullets) {

        // Check if repositories are limited
        if (/(Up to )(\d+)( repositories)/gm.test(bullet) ) {
          let number = plan.bullets[0].match(/\d+/g)!;
          this.limit = Number.parseInt(number[0]);
        }
  
        // Check if includes private repositories
        if (/Private repositories/g.test(bullet)) {
          this.ignorePrivate = false;
        }
      }

    } else {
      
      // No plan is found (direct install)
      this.name = "Exemption";
      this.ignorePrivate = false;
    }
  }

  public name: string;
  public limit: number | undefined;
  public ignorePrivate: boolean | undefined;
}


export async function getSubscribedPlan(app: Application, payload: IWebhookPayloadLabel) {

  const id: number = payload.installation.id;

  if (exemptions.has(payload.repository.owner.login)) {
    return new MarketplacePlan();
  }

  try {

    const options: Octokit.EndpointOptions = {
      method: "GET",
      url: `/marketplace_listing/accounts/${id}`
    }

    const github = await app.auth(id);
    const response = await github.request(options);
    return new MarketplacePlan(response.data.marketplace_purchase.plan);
    
  } catch(e) {
    return new MarketplacePlan();
  }
}

