# Dremio n8n Connector

A custom Dremio node for n8n, enabling you to execute SQL queries against both **Dremio Cloud** and **Dremio Software** directly from your workflows.

## Features

-   **Execute SQL**: Run any SQL query supported by Dremio.
-   **Dual Compatibility**: First-class support for both Dremio Cloud and Dremio Software (self-hosted).
-   **Secure Authentication**:
    -   **Cloud**: Authentication via Personal Access Token (PAT) and Project ID.
    -   **Software**: Authentication via Personal Access Token (PAT) and Base URL.
-   **SSL Flexibility**: Option to ignore SSL certificate validation for self-hosted instances with self-signed certificates.

## Installation

### For n8n Cloud / Enterprise (Verified Community Node)

*Note: Custom nodes must be published to npm or verified to be installable on n8n Cloud.*

1.  **Publish (If you are the developer)**:
    Ensure this package is published to npm:
    ```bash
    npm publish --access public
    ```
2.  **Install**:
    -   Go to your n8n dashboard.
    -   Navigate to **Settings** > **Community Nodes**.
    -   Click **Install Node**.
    -   Enter the package name: `n8n-nodes-dremio` (or your published name).
    -   Click **Install**.
    -   The node "Dremio" will now be available in the workflow editor.

### For Self-Hosted n8n (npm link)

If you are developing or running n8n locally:

1.  **Clone & Build**:
    ```bash
    git clone https://github.com/alexmerced/dremio-n8n.git
    cd dremio-n8n
    npm install
    npm run build
    ```

2.  **Link**:
    Navigate to your n8n custom extension directory (usually `~/.n8n/custom`):
    ```bash
    mkdir -p ~/.n8n/custom
    cd ~/.n8n/custom
    npm link /path/to/dremio-n8n
    ```

3.  **Restart**: Restart your n8n instance.

## Usage Guide

### 1. Add the Node
Open your n8n workflow, click the **+** button, and search for **Dremio**.

### 2. Configure Credentials
You can configure a single credential to use across multiple nodes.

#### Option A: Dremio Cloud
-   **Type**: Select `Cloud`
-   **Base URL**: `https://api.dremio.cloud` (Default) or `https://api.eu.dremio.cloud` for EU control plane.
-   **Project ID**: Found in your Dremio Project Settings.
-   **Access Token**: Your Personal Access Token (PAT).
-   **Ignore SSL Issues**: Leave off (False).

#### Option B: Dremio Software
-   **Type**: Select `Software`
-   **Base URL**: Your Dremio API base URL, e.g., `http://dremio.example.com:9047/api/v3`.
-   **Access Token**: Your Personal Access Token (PAT).
-   **Ignore SSL Issues**: set to `True` if using a self-signed certificate.

### 3. Execute SQL
-   **Resource**: `Query`
-   **Operation**: `Execute`
-   **SQL Query**: Enter your SQL statement.
    -   *Example*: `SELECT * FROM "Samples"."samples.dremio.com"."NYC-taxi-trips" LIMIT 10`
    -   *Tip*: Use expressions to dynamically build queries based on previous node outputs.

## How it Works
The connector uses the Dremio REST API to submit and monitor jobs:
1.  **Submission**: It posts the SQL query to the `/sql` endpoint.
2.  **Polling**: It receives a Job ID and polls the Job Status endpoint until the state is `COMPLETED`.
3.  **Retrieval**: Once completed, it fetches the results from the `/results` endpoint and returns them as JSON items.

## File Structure Overview

Understanding the repository layout:

| Path | Description |
| :--- | :--- |
| **`package.json`** | Project configuration, dependencies, and build scripts (`npm run build`). |
| **`nodes/`** | Contains the source code for the n8n node. |
| `nodes/Dremio/Dremio.node.ts` | **Main Logic**: Defines the node properties and the `execute` function that runs queries. |
| **`credentials/`** | Contains authentication definitions. |
| `credentials/DremioApi.credentials.ts` | **Auth Logic**: Defines inputs for Cloud/Software modes, Tokens, and Project IDs. |
| **`scripts/`** | Helper scripts. |
| `scripts/verify_api.js` | A standalone Node.js script to test connectivity to Dremio explicitly, outside of n8n. |

## Developer Guide

For a deep dive into how the code works, including the specific API calls and authentication flow, please read the **[Developer Guide](DEVELOPMENT.md)**.

## Troubleshooting

-   **Job Failed**: If the node errors with "Job Failed", check the Dremio UI Jobs page for detailed error messages regarding your SQL syntax.
-   **SSL Error**: If connecting to a local Dremio Software instance fails with SSL errors, ensure "Ignore SSL Issues" is toggled ON in the credentials.
-   **Timeout**: Large queries might time out if the n8n execution timeout is too short. Try to limit results using `LIMIT` or paginate if possible.
