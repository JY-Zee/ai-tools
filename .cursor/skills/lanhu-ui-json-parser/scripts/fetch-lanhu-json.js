const fs = require('fs');
const path = require('path');
const https = require('https');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

function formatTimestamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function readCookie(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing .lanhuConfig at ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const patterns = [
    /cookie\s*:\s*'([\s\S]*?)'/,
    /cookie\s*:\s*"([\s\S]*?)"/,
    /cookie\s*:\s*`([\s\S]*?)`/,
    /cookie\s*:\s*‘([\s\S]*?)’/,
    /cookie\s*:\s*“([\s\S]*?)”/,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match && match[1] && match[1].trim()) {
      return match[1].trim();
    }
  }

  throw new Error('Cookie not found in .lanhuConfig');
}

function getSearchParams(urlString) {
  const allParams = new URLSearchParams();

  const tryCollect = (value) => {
    if (!value) {
      return;
    }

    try {
      const url = new URL(value);
      for (const [key, paramValue] of url.searchParams.entries()) {
        if (!allParams.has(key)) {
          allParams.set(key, paramValue);
        }
      }
      const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
      if (hash.includes('=')) {
        const hashParams = new URLSearchParams(hash.replace(/^[^?]*\?/, ''));
        for (const [key, paramValue] of hashParams.entries()) {
          if (!allParams.has(key)) {
            allParams.set(key, paramValue);
          }
        }
      }
      return;
    } catch (error) {
      const queryStart = value.indexOf('?');
      if (queryStart !== -1) {
        const query = value.slice(queryStart + 1).split('#')[0];
        const fallback = new URLSearchParams(query);
        for (const [key, paramValue] of fallback.entries()) {
          if (!allParams.has(key)) {
            allParams.set(key, paramValue);
          }
        }
      }
    }

    const regex = /(?:^|[?&#])([^=&#]+)=([^&#]+)/g;
    let match;
    while ((match = regex.exec(value))) {
      if (!allParams.has(match[1])) {
        allParams.set(match[1], decodeURIComponent(match[2]));
      }
    }
  };

  tryCollect(urlString);
  return allParams;
}

function extractIds(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    throw new Error('Missing Lanhu URL');
  }

  const params = getSearchParams(urlString);
  const imageId = params.get('image_id');
  const projectId = params.get('project_id');

  if (!imageId || !projectId) {
    throw new Error('Unable to extract image_id and project_id from URL');
  }

  return { imageId, projectId };
}

function requestText(url, headers = {}, redirectCount = 0) {
  if (redirectCount > 5) {
    return Promise.reject(new Error('Too many redirects'));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: 'application/json,text/plain,*/*',
          'User-Agent': 'lanhu-ui-json-parser-script',
          ...headers,
        },
      },
      (response) => {
        const { statusCode = 0, headers: responseHeaders } = response;

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          responseHeaders.location
        ) {
          response.resume();
          resolve(
            requestText(responseHeaders.location, headers, redirectCount + 1)
          );
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            reject(
              new Error(
                `Request failed with status ${statusCode}: ${Buffer.concat(
                  chunks
                )
                  .toString('utf8')
                  .slice(0, 300)}`
              )
            );
          });
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
      }
    );

    request.on('error', reject);
  });
}

async function requestJson(url, headers = {}) {
  const text = await requestText(url, headers);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${url}: ${error.message}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(args['project-root'] || process.cwd());
  const url = args.url;
  const outputDir = path.resolve(
    args['output-dir'] || path.join(projectRoot, '.lanhuJson')
  );

  if (!url) {
    throw new Error('Usage: node fetch-lanhu-json.js --url <lanhu-url>');
  }

  const configPath = path.join(projectRoot, '.lanhuConfig');
  const cookie = readCookie(configPath);
  const { imageId, projectId } = extractIds(url);

  const apiUrl = `https://lanhuapp.com/api/project/image?dds_status=1&image_id=${encodeURIComponent(
    imageId
  )}&project_id=${encodeURIComponent(projectId)}`;

  const payload = await requestJson(apiUrl, {
    Cookie: cookie,
  });

  const versions = payload && payload.result && payload.result.versions;
  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error('Lanhu response does not contain result.versions[0]');
  }

  const version = versions[0];
  if (!version || !version.json_url) {
    throw new Error('Lanhu response does not contain versions[0].json_url');
  }

  const jsonPayload = await requestJson(version.json_url);
  fs.mkdirSync(outputDir, { recursive: true });

  const filename =
    args.filename || `SketchJSONURL${formatTimestamp(new Date())}.json`;
  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, JSON.stringify(jsonPayload, null, 2), 'utf8');

  console.log(`Saved Lanhu JSON to ${outputPath}`);
  console.log(`image_id=${imageId}`);
  console.log(`project_id=${projectId}`);
  console.log(`json_url=${version.json_url}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
