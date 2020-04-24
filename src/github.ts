import { 
    WebhookPayloadLabelLabel, 
    PayloadRepository, 
    WebhookPayloadLabelSender, 
    WebhookPayloadTeamAddOrganization 
} from '@octokit/webhooks'


export interface LabelHookPayload {
    action: string;
    label: WebhookPayloadLabelLabel;
    repository: PayloadRepository;
    sender: WebhookPayloadLabelSender;
    organization: WebhookPayloadTeamAddOrganization;
}

export interface IPageInfo {
    endCursor: string;
    hasNextPage: boolean;
}

export interface IRepoNode {
    id: string;
    name: string;
}

export interface IRepoQueryPayload {
    organization: {
        repositories: {
            pageInfo: IPageInfo;
            nodes: Array<IRepoNode>;
        }
    };
}
