import {
    IDataObject,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    sleep,
} from 'n8n-workflow';



export class Dremio implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Dremio',
        name: 'dremio',
        icon: 'file:dremio.svg',
        group: ['transform'],
        version: 1,
        description: 'Execute queries against Dremio Cloud or Software',
        defaults: {
            name: 'Dremio',
            color: '#55C6E3',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'dremioApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                options: [
                    {
                        name: 'Query',
                        value: 'query',
                    },
                ],
                default: 'query',
                noDataExpression: true,
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: {
                    show: {
                        resource: [
                            'query',
                        ],
                    },
                },
                options: [
                    {
                        name: 'Execute',
                        value: 'execute',
                    },
                ],
                default: 'execute',
                noDataExpression: true,
            },
            {
                displayName: 'SQL Query',
                name: 'sql',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: [
                            'query',
                        ],
                        operation: [
                            'execute',
                        ],
                    },
                },
                typeOptions: {
                    rows: 5,
                },
                description: 'The SQL query to execute',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: IDataObject[] = [];
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;
        const credentials = await this.getCredentials('dremioApi');

        const baseUrl = credentials.baseUrl as string;
        const token = credentials.token as string;
        const type = credentials.type as string;
        const projectId = credentials.projectId as string;
        const ignoreSsl = credentials.ignoreSsl as boolean;

        const requestOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            json: true,
            allowUnauthorizedCerts: ignoreSsl,
        };

        // Process each item
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'query' && operation === 'execute') {
                    const sql = this.getNodeParameter('sql', i) as string;

                    // 1. Submit Query
                    let cleanBaseUrl = baseUrl.replace(/\/$/, '');
                    let finalSubmitUrl: string;

                    if (type === 'software') {
                        finalSubmitUrl = `${cleanBaseUrl}/sql`;
                    } else {
                        // Cloud logic
                        if (!cleanBaseUrl.includes('/v0')) {
                            finalSubmitUrl = `${cleanBaseUrl}/v0/projects/${projectId}/sql`;
                        } else {
                            finalSubmitUrl = `${cleanBaseUrl}/projects/${projectId}/sql`;
                        }
                    }

                    const submitBody = { sql };
                    // Use this.helpers.request
                    const submitRes = await this.helpers.httpRequest({
                        method: 'POST',
                        url: finalSubmitUrl,
                        body: submitBody,
                        ...requestOptions,
                    });

                    const jobId = submitRes.id;

                    // 2. Poll
                    let jobState = 'RUNNING';
                    let jobUrl: string;

                    // Basic polling loop with sleep
                    while (['RUNNING', 'ENQUEUED', 'STARTING', 'ENGINE_START', 'QUEUED', 'PLANNING'].includes(jobState)) {
                        await sleep(1000);

                        if (type === 'software') {
                            jobUrl = `${cleanBaseUrl}/job/${jobId}`;
                        } else {
                            if (!cleanBaseUrl.includes('/v0')) {
                                jobUrl = `${cleanBaseUrl}/v0/projects/${projectId}/job/${jobId}`;
                            } else {
                                jobUrl = `${cleanBaseUrl}/projects/${projectId}/job/${jobId}`;
                            }
                        }

                        const jobRes = await this.helpers.httpRequest({
                            method: 'GET',
                            url: jobUrl,
                            ...requestOptions,
                        });
                        jobState = jobRes.jobState;
                    }

                    if (jobState !== 'COMPLETED') {
                        throw new Error(`Job failed with state: ${jobState}`);
                    }

                    // 3. Fetch Results
                    let resultsUrl: string;
                    if (type === 'software') {
                        resultsUrl = `${cleanBaseUrl}/job/${jobId}/results`;
                    } else {
                        if (!cleanBaseUrl.includes('/v0')) {
                            resultsUrl = `${cleanBaseUrl}/v0/projects/${projectId}/job/${jobId}/results`;
                        } else {
                            resultsUrl = `${cleanBaseUrl}/projects/${projectId}/job/${jobId}/results`;
                        }
                    }

                    const resultsRes = await this.helpers.httpRequest({
                        method: 'GET',
                        url: resultsUrl,
                        ...requestOptions,
                    });

                    const rows = resultsRes.rows || [];

                    // Add rows to return data
                    rows.forEach((row: any) => {
                        returnData.push({
                            json: row,
                            pairedItem: {
                                item: i,
                            },
                        });
                    });
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: {
                            item: i,
                        },
                    });
                    continue;
                }
                
                if (error.node) {
                     // Check if it's already a Node error (from httpRequest)
                     throw error;
                }
                // Wrap plain errors
                throw new NodeOperationError(this.getNode(), error);
            }
        }

        return [this.helpers.returnJsonArray(returnData)];
    }
}
