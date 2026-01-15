# Developer Guide

This document provides a detailed explanation of the internal logic for the Dremio n8n Connector. It is intended for developers who want to understand, modify, or extend the connector's functionality.

## 1. Authentication Logic (`credentials/DremioApi.credentials.ts`)

The authentication is handled by the `DremioApi` class, which implements the `ICredentialType` interface.

### Properties
The credential defines the following fields that the user configures in n8n:

*   **`type`**: A selector to switch between **Cloud** and **Software** modes.
*   **`baseUrl`**: The API endpoint.
    *   *Default*: `https://api.dremio.cloud`
    *   *Software Example*: `http://dremio.example.com:9047/api/v3`
*   **`projectId`**: The Dremio Project ID.
    *   *Display Condition*: Only visible when `type` is set to `cloud`.
*   **`token`**: The Personal Access Token (PAT) used for Bearer authentication.
*   **`ignoreSsl`**: A boolean flag to bypass SSL verification, useful for self-hosted instances with self-signed certificates.

## 2. Node Execution Logic (`nodes/Dremio/Dremio.node.ts`)

The core logic resides in the `Dremio` class, implementing `INodeType`.

### Node Properties (UI)
The node exposes the following inputs to the user:
*   **Resource**: Currently supports `Query`.
*   **Operation**: Currently supports `Execute`.
*   **SQL Query**: A text area for the user to input their SQL statement.

### Execution Flow (`execute` method)
When the node runs, the `execute` method performs the following steps for each input item:

1.  **Preparation**:
    *   Retrieves values for `resource`, `operation`, and `sql`.
    *   Fetches the `dremioApi` credentials (URL, Token, Project ID, SSL settings).
    *   Configures an `https.Agent` to handle the `ignoreSsl` setting.

2.  **API URL Construction**:
    The code dynamically builds the Dremio REST API endpoints based on the `type` (Cloud vs. Software) and `baseUrl`.
    *   **Software**: Uses the pattern `{baseUrl}/sql`, `{baseUrl}/job/{id}`, etc.
    *   **Cloud**: Uses the pattern `{baseUrl}/v0/projects/{projectId}/sql`. It intelligently handles cases where the user might or might not have included `/v0` in the base URL.

3.  **Job Submission (Async)**:
    *   Sends a `POST` request to the SQL endpoint with the user's query.
    *   Dremio returns a **Job ID** immediately, while the query runs asynchronously.

4.  **Job Polling**:
    *   The node enters a `while` loop, checking the Job Status endpoint (`/job/{id}`) every second.
    *   It waits while the job state is `RUNNING`, `ENQUEUED`, `PLANNING`, etc.
    *   The loop exits when the job is `COMPLETED`, `FAILED`, or `CANCELED`.

5.  **Result Retrieval**:
    *   If the job completes successfully, the node sends a `GET` request to the Results endpoint (`/job/{id}/results`).
    *   The returned JSON rows are mapped to n8n's data format and output for the next node in the workflow.

### Error Handling
*   If `Continue On Fail` is enabled in the node settings, errors are caught and output as a JSON object `{ error: message }`.
*   Otherwise, errors throw an exception and stop the workflow.
