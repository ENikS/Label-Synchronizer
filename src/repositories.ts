import { Context } from 'probot'
import { WebhookPayloadLabel } from '@octokit/webhooks'

export interface ChangedFrom {
  from: string;
}

export interface PayloadLabelChanges {
  name: ChangedFrom | undefined;
  color: ChangedFrom | undefined;
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
  owner: {
    repositories: {
        pageInfo: {
          endCursor: string;
          hasNextPage: boolean;
        };
        nodes: Array<INodeInfo>;
    }
  };
}

const orgQuery = `query labels($login: String!, $name: String!, $cursor: String) {
  owner: organization(login: $login) {
      repositories(first: 100, after: $cursor) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          id
          name
          isPrivate
          label(name: $name) {
            id
            color
            description
          }
        }
      }
    }
  }`

const userQuery = `query labels($login: String!, $name: String!, $cursor: String) {
  owner: user(login: $login) {
    repositories(first: 100, after: $cursor) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        id
        name
        isPrivate
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
    
  const tracker = {
    login: context.payload.sender.login,
    name: name,
    cursor: null as any
  }

  try 
  {
    let installations = await GetInstallations(context);

    // Query matching labels
    let data: IRepoQueryPayload
    let query = (context.payload as any).organization 
              ? orgQuery 
              : userQuery;
    let promise = context.github.graphql(query, tracker)
    
    do {
      // Wait for the results
      data = await promise as IRepoQueryPayload

      // If more data is available request it now
      if (data.owner.repositories.pageInfo.hasNextPage) {
        tracker.cursor = data.owner.repositories.pageInfo.endCursor
        promise = context.github.graphql(query, tracker)
      }

      // Yield label info for each matching repository
      for (const node of data.owner.repositories.nodes) {
        if (installations.has(node.id)) yield node
      }
    } while (data.owner.repositories.pageInfo.hasNextPage)
  } 
  catch (e) 
  {
    context.log.error(e)
  }
}


async function GetInstallations (context: Context<WebhookPayloadLabel>) {

  // Create a set of target repositories 
  let morePages = true;
  let set: Set<string> = new Set<string>();
  let options = { page: 1, per_page: 100 };
  let reposPromise = context.github.apps.listRepos(options);
  let node_id = context.payload.repository.node_id;

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
      if (node_id != repo.node_id) {
        set.add(repo.node_id);
      }
    }

  } while (morePages);

  return set;
}

