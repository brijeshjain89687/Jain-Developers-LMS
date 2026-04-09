// config/github.js
// GitHub raw video storage service
// Videos are pushed to a GitHub repo and served via raw URLs

const axios = require('axios');

const GITHUB_API = 'https://api.github.com';
const RAW_BASE   = 'https://raw.githubusercontent.com';

const owner  = () => process.env.GITHUB_OWNER;
const repo   = () => process.env.GITHUB_REPO;
const branch = () => process.env.GITHUB_BRANCH || 'main';

const githubHeaders = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

/** Get the public raw GitHub URL for a given file path */
const getVideoUrl = (filePath) =>
  `${RAW_BASE}/${owner()}/${repo()}/${branch()}/${filePath}`;

/** List files in a folder */
const listFolder = async (folderPath = '') => {
  const { data } = await axios.get(
    `${GITHUB_API}/repos/${owner()}/${repo()}/contents/${folderPath}`,
    { headers: githubHeaders() }
  );
  return data;
};

/** Upload a small file (<25 MB) via GitHub API as base64 */
const uploadFile = async (filePath, base64Content, commitMessage) => {
  let sha;
  try {
    const { data } = await axios.get(
      `${GITHUB_API}/repos/${owner()}/${repo()}/contents/${filePath}`,
      { headers: githubHeaders() }
    );
    sha = data.sha;
  } catch (_) {}

  const { data } = await axios.put(
    `${GITHUB_API}/repos/${owner()}/${repo()}/contents/${filePath}`,
    { message: commitMessage || `Upload: ${filePath}`, content: base64Content, branch: branch(), ...(sha && { sha }) },
    { headers: githubHeaders() }
  );
  return { path: filePath, url: getVideoUrl(filePath), sha: data.content.sha };
};

/** Delete a file from GitHub */
const deleteFile = async (filePath, sha) => {
  await axios.delete(
    `${GITHUB_API}/repos/${owner()}/${repo()}/contents/${filePath}`,
    { headers: githubHeaders(), data: { message: `Delete: ${filePath}`, sha, branch: branch() } }
  );
  return true;
};

/** Recursively scan the repo and return all video files */
const buildVideoIndex = async (path = '') => {
  try {
    const items = await listFolder(path);
    const results = [];
    for (const item of items) {
      if (item.type === 'dir') {
        const nested = await buildVideoIndex(item.path);
        results.push(...nested);
      } else if (/\.(mp4|webm|mov|avi)$/i.test(item.name)) {
        results.push({
          name: item.name,
          path: item.path,
          rawUrl: getVideoUrl(item.path),
          size: item.size,
          sha: item.sha,
        });
      }
    }
    return results;
  } catch {
    return [];
  }
};

module.exports = { getVideoUrl, listFolder, uploadFile, deleteFile, buildVideoIndex };
