import { Context } from 'probot'
import { Octokit } from '@octokit/rest'
import { WebhookPayloadLabelLabel,
         WebhookPayloadLabel,
         PayloadRepository,
         WebhookPayloadLabelSender,
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

export interface IPageInfo {
  endCursor: string;
  hasNextPage: boolean;
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
          pageInfo: IPageInfo;
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
    // Get installed repos

    let set: Set<string> = new Set<string>();
    const repositories = await context.github.paginate(context.github.apps.listRepos({ per_page: 100 }));
    
    for (let page of repositories as Octokit.Response<Octokit.AppsListReposResponse>[]) {
        for (let repo of page.data.repositories) {
            if (repo.node_id != (context.payload as LabelHookPayload).repository.node_id && !repo.private) {
                set.add(repo.node_id);
            }
        }
    }

    let data: IRepoQueryPayload
    let promise = context.github.graphql(query, tracker)

    do {
      // Get paged list of repositories
      data = await promise as IRepoQueryPayload
      if (data.organization.repositories.pageInfo.hasNextPage) {
        tracker.cursor = data.organization.repositories.pageInfo.endCursor
        promise = context.github.graphql(query, tracker)
      }

      for (const node of data.organization.repositories.nodes) {
        if (set.has(node.id)) yield node
      }

    } while (data.organization.repositories.pageInfo.hasNextPage)

  } catch (e) {
    context.log.error(e)
  }
}
