import { Context } from 'probot'
import { WebhookPayloadLabelLabel, WebhookPayloadLabel,
         PayloadRepository, WebhookPayloadLabelSender,
         WebhookPayloadTeamAddOrganization } from '@octokit/webhooks'

export interface ChangedFrom {
  from: string;
}

export interface PayloadLabelChanges {
  name: ChangedFrom | undefined;
  color: ChangedFrom | undefined;
}

export interface LabelHookPayload {
  action: string;
  changes: PayloadLabelChanges;
  label: WebhookPayloadLabelLabel;
  repository: PayloadRepository;
  sender: WebhookPayloadLabelSender;
  organization: WebhookPayloadTeamAddOrganization;
}

export interface ILabelInfo {
  id: string;
  color: string
  description: string | null
}

export interface INodeInfo {
  id: string;
  name: string;
  label: ILabelInfo | null;
}

export interface IRepoQueryPayload {
  organization: {
      repositories: {
          pageInfo: {
            endCursor: string;
            hasNextPage: boolean;
          };
          nodes: Array<INodeInfo>;
      }
  };
}

const query = `query labels($login: String!, $name: String!, $cursor: String) {
    organization(login: $login) {
      repositories(first: 100, after: $cursor) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          id
          name
          label(name: $name) {
            id
            color
            description
          }
        }
      }
    }
  }`

export async function * LabelEnumerator (context: Context<WebhookPayloadLabel>, name: string) {
    
  const login = (context.payload as LabelHookPayload).organization.login
  const tracker = {
    login: login,
    name: name,
    cursor: null as any
  }

  try {
    
    let installations = await GetInstallations(context);

    // Query matching labels
    let data: IRepoQueryPayload
    let promise = context.github.graphql(query, tracker)
    
    do {
      // Wait for the results
      data = await promise as IRepoQueryPayload

      // If more data is available request it now
      if (data.organization.repositories.pageInfo.hasNextPage) {
        tracker.cursor = data.organization.repositories.pageInfo.endCursor
        promise = context.github.graphql(query, tracker)
      }

      // Yield label info for each matching repository
      for (const node of data.organization.repositories.nodes) {
        if (installations.has(node.id)) yield node
      }

    } while (data.organization.repositories.pageInfo.hasNextPage)

  } catch (e) {
    context.log.error(e)
  }
}

async function GetInstallations (context: Context<WebhookPayloadLabel>) {
    // Create a set of target repositories 
    let morePages = true;
    let set: Set<string> = new Set<string>();
    let options = { page: 1, per_page: 100 };
    let reposPromise = context.github.apps.listRepos(options);

    // Get list of repos where the app is installed
    do {

      // Wait for the results
      let repos = await reposPromise;
      
      // If more data is available request it now
      let last = options.page * options.per_page;
      if (repos.data.total_count > last) {
        options.page++;
        reposPromise = context.github.apps.listRepos(options);
      } else {
        morePages = false;
      }

      // Process page
      for (let repo of repos.data.repositories) {
        if (repo.node_id != (context.payload as LabelHookPayload).repository.node_id && !repo.private) {
            set.add(repo.node_id);
        }
      }

    } while (morePages);

    return set;
}