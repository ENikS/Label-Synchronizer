import { Context } from 'probot'
import { WebhookPayloadLabel } from '@octokit/webhooks'

var exemptions = GetExemptions();

function GetExemptions() : Set<string> {
    let set = new Set<string>();
    let data =  require("../exemptions.json");
    
    for (let exemption of data.exemptions) {
        set.add(exemption.name);
    }

    return set;
}

export function Authenticate(context: Context<WebhookPayloadLabel>) : boolean {
    const login = context.payload.sender.login;

    return (exemptions && exemptions.has(login)) ? true : false;
}