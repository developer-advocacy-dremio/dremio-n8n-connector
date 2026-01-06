const axios = require('axios');
require('dotenv').config();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest(name, config) {
    console.log(`\n--- Starting Test: ${name} ---`);
    const { baseUrl, token, projectId, type } = config;
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        // 1. Submit Query
        console.log(`Submitting Query to ${baseUrl}...`);
        let sqlUrl;
        let body;

        if (type === 'software') {
            sqlUrl = `${baseUrl}/sql`;
            body = { sql: 'SELECT 1 AS test_col' };
        } else {
            sqlUrl = `${baseUrl}/projects/${projectId}/sql`;
            body = { sql: 'SELECT 1 AS test_col' };
        }

        const submitRes = await axios.post(sqlUrl, body, { headers });
        console.log('Query Submitted. Response:', submitRes.data);
        
        const jobId = submitRes.data.id;
        if (!jobId) throw new Error('No Job ID returned');
        console.log(`Job ID: ${jobId}`);

        // 2. Poll for Completion
        let jobState = 'RUNNING';
        let retries = 0;
        while (jobState !== 'COMPLETED' && jobState !== 'FAILED' && jobState !== 'CANCELED' && retries < 10) {
            await sleep(1000);
            console.log('Polling Job Status...');
            
            let jobUrl;
            if (type === 'software') {
                jobUrl = `${baseUrl}/job/${jobId}`;
            } else {
                jobUrl = `${baseUrl}/projects/${projectId}/job/${jobId}`;
            }

            const jobRes = await axios.get(jobUrl, { headers });
            jobState = jobRes.data.jobState;
            console.log(`Current State: ${jobState}`);
            retries++;
        }

        if (jobState !== 'COMPLETED') {
            throw new Error(`Job did not complete. Final state: ${jobState}`);
        }

        // 3. Fetch Results
        console.log('Fetching Results...');
        let resultsUrl;
        if (type === 'software') {
            resultsUrl = `${baseUrl}/job/${jobId}/results`;
        } else {
            resultsUrl = `${baseUrl}/projects/${projectId}/job/${jobId}/results`;
        }

        const resultsRes = await axios.get(resultsUrl, { headers });
        console.log('Results:', resultsRes.data);
        console.log(`--- Test ${name} PASSED ---\n`);

    } catch (error) {
        console.error(`--- Test ${name} FAILED ---`);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

async function main() {
    // Test Dremio Cloud
    if (process.env.DREMIO_CLOUD_TOKEN) {
        await runTest('Dremio Cloud', {
            type: 'cloud',
            baseUrl: process.env.DREMIO_CLOUD_BASE_URL,
            token: process.env.DREMIO_CLOUD_TOKEN,
            projectId: process.env.DREMIO_CLOUD_PROJECTID
        });
    } else {
        console.log('Skipping Dremio Cloud test (no token)');
    }

    // Test Dremio Software
    if (process.env.DREMIO_SOFTWARE_TOKEN) {
        await runTest('Dremio Software', {
            type: 'software',
            baseUrl: process.env.DREMIO_SOFTWARE_BASE_URL,
            token: process.env.DREMIO_SOFTWARE_TOKEN
        });
    } else {
        console.log('Skipping Dremio Software test (no token)');
    }
}

main();
