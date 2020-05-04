import { Octokit, Application } from 'probot'

var exemptions = GetExemptions();


export class MarketplacePlan {

  constructor(plan?: any) {

    if (exemptions) { /* do nothing */}

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
      this.name = "Not found";
      this.ignorePrivate = false;
    }
  }

  public name: string;
  public limit: number | undefined;
  public ignorePrivate: boolean | undefined;
}


export async function getSubscribedPlan(app: Application, id: number) {
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


function GetExemptions() : Set<string> {
  let set = new Set<string>();
  let data =  require("../exemptions.json");
  
  for (let exemption of data.exemptions) {
      set.add(exemption.name);
  }

  return set;
}

