# n8n Community Node Submission Video Script

This script guides you through the process of recording your submission video. It includes steps to start n8n locally, install your node, and demonstrate its capabilities.

**Prerequisites:**
- Node.js installed.
- `n8n-nodes-dremio` version `2.0.7` (or latest) published to npm.
- Dremio instance (Cloud or Software) accessible.
- A PAT (Personal Access Token) for Dremio.

---

## Step 0: Start n8n Locally

1.  Open your terminal.
2.  Run the following command to start n8n:
    ```bash
    npx n8n
    ```
3.  Wait for the server to start. It will typically open `http://localhost:5678/` in your default browser automatically.
4.  *Voiceover:* "I am starting a fresh local instance of n8n using `npx n8n`."

## Step 1: Install the Node

1.  In the n8n interface (`http://localhost:5678`), locate the **Settings** menu (gear icon) in the bottom-left sidebar.
2.  Select **Community Nodes**.
3.  Click the **Install** button.
4.  In the "npm Package Name" field, paste: `n8n-nodes-dremio`.
5.  Check the box "I understand the risks...".
6.  Click **Install**.
7.  *Voiceover:* "I am installing the 'n8n-nodes-dremio' package version 2.0.7 from npm, which matches the version I am submitting."

## Step 2: Create Workflow & Insert Node

1.  Click **Workflows** in the sidebar.
2.  Click **Add Workflow** (top right).
3.  Click the **+** (plus) button to add a node to the canvas.
4.  Search for "Dremio".
5.  Click the **Dremio** node to insert it.
6.  *Voiceover:* "I'm creating a new workflow and adding the Dremio node to the canvas."

## Step 3: Set Up Credentials & Test

1.  Double-click the **Dremio** node to open its configuration panel.
2.  In the **Credential for Dremio API** dropdown, select **- Create New -**.
3.  Enter your credentials:
    *   **Type**: Select 'Cloud' or 'Software' (depending on your Dremio environment).
    *   **Base URL**: e.g., `https://api.dremio.cloud` (for Cloud) or `https://<HOST>:9047/api/v3` (for Software).
    *   **Project ID**: (If Cloud) Enter your project ID (found in your Dremio URL).
    *   **Access Token**: Paste your Personal Access Token (PAT).
4.  Click the **Test Connection** button (bottom left of credential modal).
5.  Show the green "Connection tested successfully" notification.
6.  *Voiceover:* "I'm configuring the credentials with my Dremio Cloud Project ID and Token. I'll verify the connection using the Test Connection button... and it's successful."
7.  Click **Save**.

## Step 4: Demonstrate Functionality

1.  Back in the node panel settings:
    *   **Resource**: Ensure `Query` is selected.
    *   **Operation**: Ensure `Execute` is selected.
    *   **SQL Query**: Enter a simple demonstrative query.
        *   *Example:* `SELECT * FROM Samples."samples.dremio.com"."NYC-taxi-trips" LIMIT 5`
2.  Click **Execute Node**.
3.  Expand the **Output** pane to show the returned JSON data rows.
4.  *Voiceover:* "Now I will execute a standard SQL query to fetch 5 rows from the Dremio samples dataset. The node creates the job, polls for completion, and retrieves the results."

## Step 5: AI Agent Integration (Tool Capabilities)

1.  Close the Dremio node configuration.
2.  Click the **+** button and search for **AI Agent**. Add it to the workflow.
3.  Connect the **Manual Trigger** (if present) to the **AI Agent**, or ensure it's the starting point.
4.  Click the **+** button on the **Tools** input of the AI Agent node.
5.  Search for "Dremio" (or drag your configured Dremio node to the Tools connection point).
    *   *Note:* Ensure the Dremio node is connected to the **Tools** input of the AI Agent.
6.  Open the **AI Agent** node.
7.  In the Chat/Prompt window (or "Text" field if testing manually):
    *   Enter: "Please list 3 rows from the NYC taxi trips table in the Samples source."
8.  Click **Execute Node**.
9.  Wait for the Agent to call the tool and process the response.
10. Show the Agent's text response containing the data.
11. *Voiceover:* "Finally, I'm connecting the Dremio node as a Tool to an AI Agent. I'll ask the agent to query the data using natural language. The agent successfully invokes the Dremio node tool and answers the question."

**End of Video**
