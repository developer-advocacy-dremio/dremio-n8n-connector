# Developer Guide

This document explains the internal architecture of the Dremio n8n Connector for developers who want to understand, modify, or extend the code.

## Authentication (`credentials/DremioApi.credentials.ts`)

The `DremioApi` class implements `ICredentialType` and defines:

### Credential Fields
| Field | Type | Description |
|:---|:---|:---|
| `type` | Options (`cloud` / `software`) | Deployment mode selector |
| `baseUrl` | String | API endpoint (default: `https://api.dremio.cloud`) |
| `projectId` | String | Dremio Cloud Project ID (hidden for Software) |
| `token` | String (password) | Personal Access Token (PAT) |
| `ignoreSsl` | Boolean | Skip SSL validation for self-signed certs |

### Authentication Method
Uses n8n's built-in `generic` authentication type (`authenticate` block with `as const`), which automatically injects:
- `Authorization: Bearer <token>` header
- `Content-Type` and `Accept` JSON headers
- `skipSslCertificateValidation` based on `ignoreSsl`

This is consumed by `httpRequestWithAuthentication` in the node — **no manual header construction needed**.

### Credential Test
The `test` property defines an `ICredentialTestRequest` that hits the Dremio catalog endpoint:
- **Cloud**: `GET {baseUrl}/v0/projects/{projectId}/catalog`
- **Software**: `GET {baseUrl}/catalog`

HTTP errors (401, 403, etc.) are **not** suppressed — a failing credential returns an error to the user.

## Node Execution (`nodes/Dremio/Dremio.node.ts`)

The `Dremio` class implements `INodeType` with a single resource (`Query`) and operation (`Execute`).

### Execution Flow

```
┌─────────────┐     ┌──────────┐     ┌───────────────┐
│ Submit Query │────▶│ Poll Job │────▶│ Fetch Results │
│  POST /sql   │     │ GET /job/ │     │ GET /results  │
└─────────────┘     └──────────┘     └───────────────┘
```

1. **Submit** — `POST` to `/sql` with the SQL query body. Returns a Job ID.
2. **Poll** — Loops every 1 second (using n8n's `sleep`) while job state is `RUNNING`, `ENQUEUED`, `STARTING`, `ENGINE_START`, `QUEUED`, or `PLANNING`.
3. **Fetch** — On `COMPLETED`, fetches results from `/job/{id}/results`.

### URL Construction
URLs are built dynamically based on deployment type:
- **Software**: `{baseUrl}/sql`, `{baseUrl}/job/{id}`, `{baseUrl}/job/{id}/results`
- **Cloud**: `{baseUrl}/v0/projects/{projectId}/sql` (auto-detects if `/v0` is already in the base URL)

### HTTP Requests
All API calls use `this.helpers.httpRequestWithAuthentication.call(this, 'dremioApi', options)`, which:
- Injects auth headers from the credential `authenticate` block
- Handles SSL settings
- Returns parsed JSON

### Data Lineage (`pairedItem`)
Each output item is typed as `INodeExecutionData` (not `IDataObject`) and includes `pairedItem: { item: i }` linking each result row back to its input item. The return statement uses `return [returnData]` directly — **not** `returnJsonArray` (which would strip `pairedItem`).

### Error Handling
- **`NodeOperationError`** — Used for job failures (`Job failed with state: FAILED`)
- **`continueOnFail()`** — If enabled, errors are caught and returned as `{ error: message }` with `pairedItem` preserved
- **Re-throw check** — Errors already wrapped by n8n (with `error.node`) are re-thrown as-is to avoid double-wrapping

## Build Tooling

| Command | Description |
|:---|:---|
| `npm run build` | `tsc` + `copyfiles` (copies SVG icons to `dist/`) |
| `npm run lint` | ESLint with `@typescript-eslint` |
| `npm run dev` | TypeScript watch mode |

### CI/CD
Publishing is automated via `.github/workflows/publish.yml`:
- Triggered on GitHub Release (`published`)
- Runs `npm ci` → `build` → `lint` → `npm publish --provenance`
- Uses `NPM_TOKEN` secret for authentication
- Generates npm provenance statements signed by GitHub Actions OIDC

## Local API Testing

```bash
cp .env.template .env   # Fill in credentials
node scripts/verify_api.js
```

The script exercises the same Submit → Poll → Fetch flow as the node, using native `fetch` against the Dremio REST API.
