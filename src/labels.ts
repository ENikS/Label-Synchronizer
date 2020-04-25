import { GitHubAPI } from 'probot'
import { IRepoQueryPayload } from './github-wrapper'

const query = `query labels($login: String!, $name: String!, $cursor: String) {
    organization(login: $login) {
      repositories(first: 30, after: $cursor) {
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

  
export async function* LabelEnumerator(github: GitHubAPI, login: string, name: string) {

    let tracker = {
        "login":  login,
        "name":   name,
        "cursor": null as any,
    };
    
    try 
    {
        let data: IRepoQueryPayload;
        let promise = github.graphql(query, tracker);

        do 
        {
            // Get paged list of repositories
            data = await promise as IRepoQueryPayload;
            if (data.organization.repositories.pageInfo.hasNextPage) {
                tracker.cursor = data.organization.repositories.pageInfo.endCursor;
                promise = github.graphql(query, tracker);
            }
            
            for (let node of data.organization.repositories.nodes) {
                yield node;
            }

        } while(data.organization.repositories.pageInfo.hasNextPage);
        

    }
    catch(e)
    {
        console.log(e);
    }
}
