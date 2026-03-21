// graph.js — Microsoft Graph API wrapper for OneDrive habits-data.json

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
// Uses the special app folder (/Apps/HabiTrax/) — created automatically on first write
const FILE_PATH = `${GRAPH_BASE}/me/drive/special/approot:/habits-data.json:/content`;

const EMPTY_DATA = { habits: [], log: {} };

async function graphFetch(url, options = {}) {
  const token = await window.auth.getToken();
  const resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return resp;
}

async function loadData() {
  const resp = await graphFetch(FILE_PATH);
  if (resp.status === 404) {
    return structuredClone(EMPTY_DATA);
  }
  if (!resp.ok) {
    throw new Error(`Graph read failed: ${resp.status}`);
  }
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new SyntaxError('malformed_json');
  }
}

async function saveData(data) {
  const resp = await graphFetch(FILE_PATH, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    throw new Error(`Graph write failed: ${resp.status}`);
  }
}

window.graph = { loadData, saveData };
