import { WebhookPayloadLabelSender, PayloadRepository, WebhookPayloadRepositoryDispatchInstallation } from '@octokit/webhooks'

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
    label: ILabelInfo | null | undefined;
}

export interface ChangedFrom {
    from: string;
}
  
export interface PayloadLabelChanges {
    name:  ChangedFrom | undefined;
    color: ChangedFrom | undefined;
}



export interface IWebhookPayloadLabel {
    action: string;
    label: ILabelInfo;
    changes: PayloadLabelChanges;
    repository: PayloadRepository;
    sender: WebhookPayloadLabelSender;
    installation: WebhookPayloadRepositoryDispatchInstallation;
  }
  
