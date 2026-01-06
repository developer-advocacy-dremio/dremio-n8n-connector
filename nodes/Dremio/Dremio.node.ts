import {
    IExecuteFunctions,
} from 'n8n-core';

import {
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

import axios, { AxiosRequestConfig } from 'axios';
import * as https from 'https';

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

        const httpsAgent = new https.Agent({
            rejectUnauthorized: !ignoreSsl
        });

        const headers = {
            'Authorization': \`Bearer \${token}\`,
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		};

		// Process each item
		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'query' && operation === 'execute') {
					const sql = this.getNodeParameter('sql', i) as string;

					// 1. Submit Query
					let submitUrl;
					if (type === 'software') {
						submitUrl = \`\${baseUrl}/sql\`;
					} else {
						submitUrl = \`\${baseUrl}/projects/\${projectId}/sql\`;
					} // Removed 'v0' hardcoding here as user might supply it in baseUrl, but better safety:
                    // If user supplied base url ends in /, remove it.
                    // Actually, let's assume user follows instruction. 
                    // My previous verification script used provided process.env.
                    // The plan said:
                    // Software: {baseUrl}/api/v3/sql
                    // Cloud: {baseUrl}/v0/projects/{projectId}/sql
                    // The credential description says "https://<HOST>:9047/api/v3". 
                    // So if types is software, we append /sql.
                    // If types is cloud, we assume baseUrl is https://api.dremio.cloud and we need /v0... 
                    // Let's stick to the script logic which was robust.

    
                    // Let's refine the URL construction based on Inputs
                    let cleanBaseUrl = baseUrl.replace(/\/$/, "");
                    let finalSubmitUrl: string;

                    if (type === 'software') {
                        // Assume user puts full path to api/v3 or we handle it? 
                        // Implementation plan said "Software: POST {baseUrl}/api/v3/sql"
                        // But credential description says "https://<HOST>:9047/api/v3".
                        // So if user follows desc, we just append /sql.
                        finalSubmitUrl = \`\${cleanBaseUrl}/sql\`;
                    } else {
                        // Cloud: https://api.dremio.cloud
                        // Plan: POST {baseUrl}/v0/projects/{projectId}/sql
                        // Verify script: `${ baseUrl }/projects/${ projectId } /sql` (where env var had /v0 included)
        // If user enters "https://api.dremio.cloud", we need to add /v0.
        if (!cleanBaseUrl.includes('/v0')) {
            finalSubmitUrl = \`\${cleanBaseUrl}/v0/projects/\${projectId}/sql\`;
                        } else {
                             finalSubmitUrl = \`\${cleanBaseUrl}/projects/\${projectId}/sql\`;
                        }
                    }

					const submitBody = { sql };
					const submitRes = await axios.post(finalSubmitUrl, submitBody, { headers, httpsAgent });
					const jobId = submitRes.data.id;

					// 2. Poll
					let jobState = 'RUNNING';
                    let jobUrl: string;
					while (['RUNNING', 'ENQUEUED', 'STARTING', 'ENGINE_START', 'QUEUED', 'PLANNING'].includes(jobState)) {
						await new Promise(resolve => setTimeout(resolve, 1000));
						
                        if (type === 'software') {
                            jobUrl = \`\${cleanBaseUrl}/job/\${jobId}\`;
                        } else {
                             // Same logic for cloud path
                             if (!cleanBaseUrl.includes('/v0')) {
                                jobUrl = \`\${cleanBaseUrl}/v0/projects/\${projectId}/job/\${jobId}\`;
                            } else {
                                jobUrl = \`\${cleanBaseUrl}/projects/\${projectId}/job/\${jobId}\`;
                            }
                        }

						const jobRes = await axios.get(jobUrl, { headers, httpsAgent });
						jobState = jobRes.data.jobState;
					}

					if (jobState !== 'COMPLETED') {
						throw new Error(\`Job failed with state: \${jobState}\`);
					}

					// 3. Fetch Results
                    let resultsUrl: string;
                     if (type === 'software') {
                        resultsUrl = \`\${cleanBaseUrl}/job/\${jobId}/results\`;
                    } else {
                         if (!cleanBaseUrl.includes('/v0')) {
                            resultsUrl = \`\${cleanBaseUrl}/v0/projects/\${projectId}/job/\${jobId}/results\`;
                        } else {
                            resultsUrl = \`\${cleanBaseUrl}/projects/\${projectId}/job/\${jobId}/results\`;
                        }
                    }

					const resultsRes = await axios.get(resultsUrl, { headers, httpsAgent });
                    const rows = resultsRes.data.rows || []; // Dremio returns { rowCount, schema, rows }

                    // Add rows to return data
                    rows.forEach((row: any) => {
                         returnData.push({ json: row });
                    });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
