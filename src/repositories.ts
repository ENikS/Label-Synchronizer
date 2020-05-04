import { Application } from 'probot'
import { WebhookPayloadLabel, WebhookPayloadLabelSender, PayloadRepository, WebhookPayloadRepositoryDispatchInstallation } from '@octokit/webhooks'
import { getSubscribedPlan } from './plans'

export const MAX_ITEMS_PER_TRANSACTION = parseInt(process.env.MAX_ITEMS_PER_TRANSACTION || '100', 10);

export interface ILabelInfo {
  node_id: string;
  id: number;
  url: string;
  name: string;
  color: string;
  default: boolean;
  description: string | null | undefined;
}

export interface INodeInfo {
  id: string;
  name: string;
  owner: { login: string; }
  databaseId: number;
  label: ILabelInfo | null;
}

export interface IRepoQueryPayload {
  viewer: {
    repositories: {
        pageInfo: {
          endCursor: string;
          hasNextPage: boolean;
        };
        nodes: Array<INodeInfo>
    }
  }
}

interface ILabelWebhookPayload {
  action: string;
  label: ILabelInfo;
  repository: PayloadRepository;
  sender: WebhookPayloadLabelSender;
  installation: WebhookPayloadRepositoryDispatchInstallation;
}

export async function * getAuthorizedRepositories(app: Application, data: WebhookPayloadLabel) {
  
  const queryAll = `
  query getRepoInfos($name: String!, $cursor: String, $size: Int!) {
    viewer {
      repositories(first: $size, ownerAffiliations: OWNER, after: $cursor) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          id
          name
          owner { login }
          databaseId
          label(name: $name) {
            name
            id
            color
            description
          }
        }
      }
    }
  }
  `
  const queryPublic = `
  query getRepoInfos($name: String!, $cursor: String, $size: Int!) {
    viewer {
      repositories(first: $size, ownerAffiliations: OWNER, after: $cursor, privacy: PUBLIC) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          id
          name
          owner { login }
          databaseId
          label(name: $name) {
            name
            id
            color
            description
          }
        }
      }
    }
  }
  `
  const payload = data as ILabelWebhookPayload; 
  const plan = getSubscribedPlan(app, payload.installation.id);
  const github = await app.auth(payload.installation.id);

  try 
  {
    const query = (await plan).ignorePrivate ? queryPublic : queryAll;
    const tracker = {
      size: MAX_ITEMS_PER_TRANSACTION,
      name: payload.label.name,
      cursor: null as any
    }
    
    // Query matching labels
    let data: IRepoQueryPayload
    let promise = github.graphql(query, tracker)
    
    do 
    {
      // Wait for the results
      data = await promise as IRepoQueryPayload

      // If more data is available request it now
      if (data.viewer.repositories.pageInfo.hasNextPage) {
        tracker.cursor = data.viewer.repositories.pageInfo.endCursor
        promise = github.graphql(query, tracker)
      }

      // Yield label info for each matching repository
      for (const node of data.viewer.repositories.nodes) {
        yield node
      }

      // Repeat while more data is available
    } while (data.viewer.repositories.pageInfo.hasNextPage)

  } 
  catch (e) 
  {
    github.log.error(e)
  }
}
