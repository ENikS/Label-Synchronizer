import { GitHubAPI, Octokit } from "probot";
import { WebhookPayloadLabelLabel } from '@octokit/webhooks'
import { INodeInfo } from "./typings";

export function CreateLabel(github: GitHubAPI, node: INodeInfo, label: WebhookPayloadLabelLabel) {
  
    // Create label
    const options: Octokit.IssuesCreateLabelParams = {
        owner: node.owner.login,
        repo:  node.name,
        name:  label.name,
        color: label.color,
        description: (label as any).description
    }

    github.log.debug(`Crating label: ${options}`);

    github.issues.createLabel(options)
                .catch((e: Octokit.HookError) => {

                    // Ignore 'already exist' message and 
                    // log the any other  

                    if (e.status != 422) {
                        github.log.error(e.message)
                        return
                    }

                    // Resend as update request
                    const update = options as any
                    update.current_name = options.name

                    github.issues
                    .updateLabel(update)                        
                    .catch((e: Octokit.HookError) => {
                        github.log.error(e.message)
                    })
                })
}


export function UpdateLabel(github: GitHubAPI, node: INodeInfo, label: WebhookPayloadLabelLabel) {

    if (null == node.label) {
        github.log.error("Invalid label passed for an update");
        return;
    }

    // Skip if no changes found
    if (node.label.name == label.name && node.label.color == label.color && node.label.description == (label as any).description) {
        return; 
    }

    const options: Octokit.IssuesUpdateLabelParams = {
        owner: node.owner.login,
        repo: node.name,
        current_name: node.label.name,
        name:  label.name,
        color: label.color,
        description: (label as any).description
    }
      
    github.log.debug(`Updating label: ${options}`);

    github
        .issues
        .updateLabel(options)
        .catch((e: Octokit.HookError) => {
            github.log.error(e.message)
        })
}


export function DeleteLabel(github: GitHubAPI, node: INodeInfo) {
  
    if (null == node.label) return;

    const options: Octokit.IssuesDeleteLabelParams = {
        owner: node.owner.login,
        repo: node.name,
        name: node.label.name
    }
  
    github.log.debug(`Deleting label: ${options}`);
      
    github
        .issues
        .deleteLabel(options)
        .catch((e: Octokit.HookError) => {
            github.log.error(e.message)
        })
  }
