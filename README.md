# Dremio n8n Connector

A community n8n node for executing SQL queries against **Dremio Cloud** and **Dremio Software** directly from your n8n workflows.

[![npm](https://img.shields.io/npm/v/n8n-nodes-dremio)](https://www.npmjs.com/package/n8n-nodes-dremio)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Execute SQL** — Run any SQL query supported by Dremio
- **Dual Compatibility** — First-class support for both Dremio Cloud and Dremio Software (self-hosted)
- **Credential-Based Auth** — Authentication via Personal Access Token (PAT) using n8n's built-in `httpRequestWithAuthentication`
- **Automatic Credential Test** — Validates your credentials when you save them in n8n
- **SSL Flexibility** — Option to skip SSL certificate validation for self-hosted instances with self-signed certificates
- **Data Lineage** — Full `pairedItem` tracking for n8n's data lineage feature
- **Proper Error Handling** — Uses `NodeOperationError` for clear, actionable error messages

## Installation

### n8n Community Nodes (Recommended)

1. Go to your n8n dashboard
2. Navigate to **Settings** > **Community Nodes**
3. Click **Install a community node**
4. Enter: `n8n-nodes-dremio`
5. Click **Install**

The **Dremio** node will now be available in your workflow editor.

### Self-Hosted n8n (Manual)

```bash
# Clone and build
git clone https://github.com/developer-advocacy-dremio/dremio-n8n-connector.git
cd dremio-n8n-connector
npm install
npm run build

# Link to n8n
mkdir -p ~/.n8n/custom
cd ~/.n8n/custom
npm link /path/to/dremio-n8n-connector

# Restart n8n
```

## Usage Guide

### 1. Add the Node
Open your n8n workflow, click **+**, and search for **Dremio**.

### 2. Configure Credentials

Click the credential dropdown and create a new **Dremio API** credential.

#### Dremio Cloud
| Field | Value |
|:---|:---|
| **Type** | `Cloud` |
| **Base URL** | `https://api.dremio.cloud` (default) or `https://api.eu.dremio.cloud` for EU |
| **Project ID** | Found in Dremio Cloud → Project Settings |
| **Access Token** | Your Personal Access Token (PAT) |
| **Ignore SSL Issues** | `False` |

#### Dremio Software
| Field | Value |
|:---|:---|
| **Type** | `Software` |
| **Base URL** | `https://<HOST>:9047/api/v3` |
| **Access Token** | Your Personal Access Token (PAT) |
| **Ignore SSL Issues** | `True` if using a self-signed certificate |

> **Tip:** Click **Test Credential** to verify connectivity before saving.

### 3. Execute SQL
- **Resource**: `Query`
- **Operation**: `Execute`
- **SQL Query**: Your SQL statement

**Examples:**
```sql
-- Query sample data
SELECT * FROM "Samples"."samples.dremio.com"."NYC-taxi-trips" LIMIT 10

-- Use with expressions from previous nodes
SELECT * FROM my_table WHERE id = '{{ $json.id }}'
```

## How It Works

The connector uses the Dremio REST API's asynchronous job execution model:

1. **Submit** — `POST` the SQL query to the `/sql` endpoint → receives a Job ID
2. **Poll** — Checks job status every second until `COMPLETED`, `FAILED`, or `CANCELED`
3. **Fetch** — Retrieves results from `/job/{id}/results` and outputs rows as n8n items

Each output item includes `pairedItem` metadata for n8n's data lineage tracking.

## Project Structure

| Path | Description |
|:---|:---|
| `credentials/DremioApi.credentials.ts` | Credential definition — auth, SSL, and credential test |
| `nodes/Dremio/Dremio.node.ts` | Node logic — SQL execution via submit/poll/fetch |
| `nodes/Dremio/dremio.svg` | Node icon |
| `scripts/verify_api.js` | Standalone API test script (reads from `.env`) |
| `.github/workflows/publish.yml` | GitHub Actions — auto-publish to npm with provenance on release |
| `.env.template` | Template for local API testing credentials |

## Development

See the **[Developer Guide](DEVELOPMENT.md)** for implementation details.

### Quick Start

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript + copy SVG assets
npm run lint         # Run ESLint
npm run dev          # Watch mode for development
```

### Testing API Connectivity

```bash
cp .env.template .env   # Fill in your Dremio credentials
node scripts/verify_api.js
```

### Publishing

Releases are automated via GitHub Actions. To publish a new version:

1. Bump the version in `package.json`
2. Commit, tag, and push:
   ```bash
   git tag v2.x.x
   git push origin main --tags
   ```
3. Create a **GitHub Release** from the tag — this triggers the publish workflow

## Troubleshooting

| Problem | Solution |
|:---|:---|
| **Job Failed** | Check the Dremio UI Jobs page for detailed SQL error messages |
| **SSL Error** | Toggle **Ignore SSL Issues** to `True` in credentials |
| **Timeout** | Use `LIMIT` clauses or paginate large result sets |
| **Credential Test Fails** | Verify your PAT is valid and Project ID is correct (Cloud) |
| **401 Unauthorized** | Regenerate your Personal Access Token in Dremio |

## License

[MIT](LICENSE)
