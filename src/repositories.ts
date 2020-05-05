import { Application } from 'probot'
import { WebhookPayloadLabel } from '@octokit/webhooks'
import { getSubscribedPlan } from './plans'
import { INodeInfo, ILabelInfo, IWebhookPayloadLabel } from './typings';

export const MAX_ITEMS_PER_TRANSACTION = parseInt(process.env.MAX_ITEMS_PER_TRANSACTION || '100', 10);


interface IQueryPayload {
  viewer: {
      repositories: {
        pageInfo: {
          endCursor: string;
          hasNextPage: boolean;
        };
        nodes: Array<any>;
      }
  };
}

export async function * getChangeCandidates(app: Application, data: WebhookPayloadLabel) {

  const payload = data as IWebhookPayloadLabel; 
  const planPromise = getSubscribedPlan(app, payload.installation.id);
  const githubPromise = app.auth(payload.installation.id);
  const databaseId = payload.repository.id;
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

  try 
  {
    const tracker = {
      size: MAX_ITEMS_PER_TRANSACTION,
      name: payload.label.name,
      cursor: null as any
    }
    const plan = await planPromise;
    const query = plan.ignorePrivate ? queryPublic : queryAll;
    const github = await githubPromise;
    
    // Query matching labels
    let count = 0;
    let data: IQueryPayload
    let promise = github.graphql(query, tracker)
    
    do 
    {
      // Wait for the results
      data = await promise as IQueryPayload

      // If more data is available request it now
      if (data.viewer.repositories.pageInfo.hasNextPage) {
        tracker.cursor = data.viewer.repositories.pageInfo.endCursor
        promise = github.graphql(query, tracker)
      }

      // Yield label info for each matching repository
      for (const node of data.viewer.repositories.nodes) {
        if (node.databaseId == databaseId) continue;

        yield node as INodeInfo;

        if (typeof plan.limit !== 'undefined' && plan.limit < ++count) return;
      }

      // Repeat while more data is available
    } while (data.viewer.repositories.pageInfo.hasNextPage)

  } 
  catch (e) 
  {
    app.log.error(e)
  }
}


export interface IBinaryNodeInfo extends INodeInfo {
  original: ILabelInfo | undefined;
}

export async function * getRenameCandidates(app: Application, data: WebhookPayloadLabel) {
  
  const payload = data as IWebhookPayloadLabel; 
  const planPromise = getSubscribedPlan(app, payload.installation.id);
  const githubPromise = app.auth(payload.installation.id);
  const databaseId = payload.repository.id;
  const queryAll = `
  query getRepoInfos($names: String!, $cursor: String, $size: Int!) {
    viewer {
      repositories(first: $size, ownerAffiliations: OWNER, after: $cursor) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          id
          name
          owner {
            login
          }
          databaseId
          labels(first: 10, query: $names) {
            nodes {
              color
              description
              id
              name
            }
          }
        }
      }
    }
  }
  `
  const queryPublic = `
  query getRepoInfos($names: String!, $cursor: String, $size: Int!) {
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
          labels(first: 10, query: $names) {
            nodes {
              color
              description
              id
              name
            }
          }
        }
      }
    }
  }
  `
  const oldName = payload.changes.name?.from;
  const newName = payload.label.name;

  try 
  {
    const tracker = {
      size: MAX_ITEMS_PER_TRANSACTION,
      names: `${newName} ${oldName}`,
      cursor: null as any
    }
    const plan = await planPromise;
    const query = plan.ignorePrivate ? queryPublic : queryAll;
    const github = await githubPromise;
    
    // Query matching labels
    let count = 0;
    let data: IQueryPayload
    let promise = github.graphql(query, tracker)
    
    do 
    {
      // Wait for the results
      data = await promise as IQueryPayload

      // If more data is available request it now
      if (data.viewer.repositories.pageInfo.hasNextPage) {
        tracker.cursor = data.viewer.repositories.pageInfo.endCursor
        promise = github.graphql(query, tracker)
      }

      // Yield label info for each matching repository
      for (let node of data.viewer.repositories.nodes) {
        
        // Skip originating repository
        if (node.databaseId == databaseId) continue;

        // Scan and initialize found labels

        let source = null;
        let target = null;

        for(const label of node.labels.nodes) {
          
          if (label.name === newName) {
            target = label;
          }

          if (label.name === oldName) {
            source = label;
          }
        }

        // Assign found labels
        if (source && target) {
          node.label    = target;
          node.original = source;
        } else if (source) {
          node.label = source;
        } else if (target) {
          node.label = target;
        } 

        yield node as IBinaryNodeInfo;
        
        if (typeof plan.limit !== 'undefined' && plan.limit < ++count) return;
      }

      // Repeat while more data is available
    } while (data.viewer.repositories.pageInfo.hasNextPage)

  } 
  catch (e) 
  {
    app.log.error(e)
  }
}
