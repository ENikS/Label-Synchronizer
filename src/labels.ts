import { GitHubAPI } from 'probot'
import {
  WebhookPayloadLabelLabel,
  PayloadRepository,
  WebhookPayloadLabelSender,
  WebhookPayloadTeamAddOrganization
} from '@octokit/webhooks'

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
  label: ILabelInfo | null
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

export async function * LabelEnumerator (github: GitHubAPI, login: string, repo: string, name: string) {
  const tracker = {
    login: login,
    name: name,
    cursor: null as any
  }

  try {
    let data: IRepoQueryPayload
    let promise = github.graphql(query, tracker)

    do {
      // Get paged list of repositories
      data = await promise as IRepoQueryPayload
      if (data.organization.repositories.pageInfo.hasNextPage) {
        tracker.cursor = data.organization.repositories.pageInfo.endCursor
        promise = github.graphql(query, tracker)
      }

      for (const node of data.organization.repositories.nodes) {
        if (node.name == repo) continue
        yield node
      }
    } while (data.organization.repositories.pageInfo.hasNextPage)
  } catch (e) {
    console.log(e)
  }
}
