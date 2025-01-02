const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_KEY = process.env.STEAMSHIP_API_KEY;
const BASE_URL = 'https://api.steamship.com/api/v1';

if (!API_KEY) {
    console.error('Error: STEAMSHIP_API_KEY environment variable is not set.');
    process.exit(1);
}

async function fetchWorkspaces(pageToken = null) {
    const response = await axios.post(
        `${BASE_URL}/workspace/list`,
        pageToken ? { pageToken } : {},
        {
            headers: { Authorization: `Bearer ${API_KEY}` },
        }
    );
    return response?.data?.data;
}

async function fetchFiles(workspaceId) {
    const response = await axios.post(`${BASE_URL}/file/list`, {}, {
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'x-workspace-id': workspaceId,
        },
    });
    return response?.data?.data?.files;
}

async function downloadFileAsJson(workspaceId, fileHandle, fileId, workspaceHandle) {
    const response = await axios.post(`${BASE_URL}/file/get`, { handle: fileHandle }, {
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'x-workspace-id': workspaceId,
        },
    });

    const dir = path.join(__dirname, 'downloads', workspaceHandle);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${fileHandle}__${fileId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2));
}

(async () => {
    try {
        let pageToken = null;

        do {
            const { workspaces, nextPageToken } = await fetchWorkspaces(pageToken);
            pageToken = nextPageToken || null;

            for (const workspace of workspaces) {
                const files = await fetchFiles(workspace.id);
                console.log(`Workspace: ${workspace.handle}, Files: ${files.length}`);

                for (const file of files) {
                    console.log(`Downloading file: ${file.handle} from workspace: ${workspace.handle}`);
                    await downloadFileAsJson(workspace.id, file.handle, file.id, workspace.handle);
                }
            }
        } while (pageToken);

        console.log('All files downloaded successfully.');
    } catch (error) {
        console.error('Error:', error.message);
    }
})();