/**
 * Quick API verification script for the Dremio n8n connector.
 * Reads credentials from .env and runs a SELECT 1 query
 * through the same Submit → Poll → Fetch flow the node uses.
 *
 * Usage: node scripts/verify_api.js
 */

const fs = require('fs');
const path = require('path');

// Simple .env loader (no external deps needed)
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        console.error('No .env file found. Copy .env.template to .env and fill in your credentials.');
        process.exit(1);
    }
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        process.env[key] = val;
    }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    loadEnv();

    const type = process.env.DREMIO_TYPE || 'cloud';
    const baseUrl = (process.env.DREMIO_BASE_URL || '').replace(/\/$/, '');
    const token = process.env.DREMIO_TOKEN;
    const projectId = process.env.DREMIO_PROJECT_ID;

    if (!baseUrl || !token) {
        console.error('DREMIO_BASE_URL and DREMIO_TOKEN must be set in .env');
        process.exit(1);
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    console.log(`Testing Dremio ${type} at ${baseUrl}...`);

    // 1. Submit Query
    let sqlUrl;
    if (type === 'software') {
        sqlUrl = `${baseUrl}/sql`;
    } else {
        if (!baseUrl.includes('/v0')) {
            sqlUrl = `${baseUrl}/v0/projects/${projectId}/sql`;
        } else {
            sqlUrl = `${baseUrl}/projects/${projectId}/sql`;
        }
    }

    console.log(`1. Submitting query to: ${sqlUrl}`);
    const submitRes = await fetch(sqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sql: 'SELECT 1 AS test_col' }),
    });

    if (!submitRes.ok) {
        const errText = await submitRes.text();
        console.error(`Submit FAILED (${submitRes.status}): ${errText}`);
        process.exit(1);
    }

    const submitData = await submitRes.json();
    const jobId = submitData.id;
    console.log(`   Job ID: ${jobId}`);

    // 2. Poll for completion
    let jobState = 'RUNNING';
    let retries = 0;
    const maxRetries = 30;
    while (!['COMPLETED', 'FAILED', 'CANCELED'].includes(jobState) && retries < maxRetries) {
        await sleep(1000);

        let jobUrl;
        if (type === 'software') {
            jobUrl = `${baseUrl}/job/${jobId}`;
        } else {
            if (!baseUrl.includes('/v0')) {
                jobUrl = `${baseUrl}/v0/projects/${projectId}/job/${jobId}`;
            } else {
                jobUrl = `${baseUrl}/projects/${projectId}/job/${jobId}`;
            }
        }

        const jobRes = await fetch(jobUrl, { headers });
        const jobData = await jobRes.json();
        jobState = jobData.jobState;
        console.log(`2. Poll #${retries + 1}: ${jobState}`);
        retries++;
    }

    if (jobState !== 'COMPLETED') {
        console.error(`Job did not complete. Final state: ${jobState}`);
        process.exit(1);
    }

    // 3. Fetch results
    let resultsUrl;
    if (type === 'software') {
        resultsUrl = `${baseUrl}/job/${jobId}/results`;
    } else {
        if (!baseUrl.includes('/v0')) {
            resultsUrl = `${baseUrl}/v0/projects/${projectId}/job/${jobId}/results`;
        } else {
            resultsUrl = `${baseUrl}/projects/${projectId}/job/${jobId}/results`;
        }
    }

    console.log(`3. Fetching results from: ${resultsUrl}`);
    const resultsRes = await fetch(resultsUrl, { headers });
    const resultsData = await resultsRes.json();

    console.log('   Rows:', JSON.stringify(resultsData.rows, null, 2));
    console.log('\n✅ TEST PASSED — Dremio API is working correctly!');
}

main().catch(err => {
    console.error('❌ TEST FAILED:', err.message);
    process.exit(1);
});
