import {
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class DremioApi implements ICredentialType {
    name = 'dremioApi';
    displayName = 'Dremio API';
    properties: INodeProperties[] = [
        {
            displayName: 'Type',
            name: 'type',
            type: 'options',
            options: [
                {
                    name: 'Cloud',
                    value: 'cloud',
                },
                {
                    name: 'Software',
                    value: 'software',
                },
            ],
            default: 'cloud',
        },
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: 'https://api.dremio.cloud',
            placeholder: 'https://api.dremio.cloud',
            description: 'The API base URL. For Software: https://<HOST>:9047/api/v3',
        },
        {
            displayName: 'Project ID',
            name: 'projectId',
            type: 'string',
            default: '',
            displayOptions: {
                show: {
                    type: [
                        'cloud',
                    ],
                },
            },
            description: 'The Project ID (Required for Cloud)',
        },
        {
            displayName: 'Access Token',
            name: 'token',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            description: 'Personal Access Token',
        },
        {
            displayName: 'Ignore SSL Issues',
            name: 'ignoreSsl',
            type: 'boolean',
            default: false,
            description: 'Whether to ignore SSL certificate validation (useful for self-signed certs)',
        },
    ];

    authenticate = {
        type: 'generic' as 'generic',
        properties: {
            headers: {
                'Authorization': '={{"Bearer " + $credentials.token}}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            rejectUnauthorized: '={{!$credentials.ignoreSsl}}'
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.baseUrl}}',
            url: '={{$credentials.type === "software" ? "/catalog" : "/v0/projects/" + $credentials.projectId + "/catalog"}}',
            method: 'GET',
            ignoreHttpStatusErrors: true,
        },
    };
}
