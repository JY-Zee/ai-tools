const fs = require('fs');
const path = require('path');

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

function sanitizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s"'`~!@#$%^&*()+=[\]{}|\\:;,.<>/?-]+/g, '');
}

function levenshtein(a, b) {
  const left = sanitizeName(a);
  const right = sanitizeName(b);

  if (!left) {
    return right.length;
  }
  if (!right) {
    return left.length;
  }

  const matrix = Array.from({ length: left.length + 1 }, () =>
    new Array(right.length + 1).fill(0)
  );

  for (let i = 0; i <= left.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= right.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}

function getFrame(layer) {
  return layer && (layer.ddsOriginFrame || layer.layerOriginFrame) || null;
}

function hasUsefulLayerShape(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return false;
  }

  return Boolean(
    node.id &&
      (
        typeof node.name === 'string' ||
        getFrame(node) ||
        Array.isArray(node.fills) ||
        node.font
      )
  );
}

function collectLayers(node, map = new Map(), seen = new Set()) {
  if (!node || typeof node !== 'object') {
    return map;
  }

  if (seen.has(node)) {
    return map;
  }
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {
      collectLayers(item, map, seen);
    }
    return map;
  }

  if (hasUsefulLayerShape(node) && !map.has(node.id)) {
    map.set(node.id, node);
  }

  for (const value of Object.values(node)) {
    collectLayers(value, map, seen);
  }

  return map;
}

function getRootLayer(data) {
  if (!data || !Array.isArray(data.info) || data.info.length === 0) {
    throw new Error('JSON does not contain info[0]');
  }

  return data.info[0];
}

function getLayerPool(data) {
  if (Array.isArray(data.info) && data.info.length > 0) {
    return Array.from(collectLayers(data.info).values());
  }
  return Array.from(collectLayers(data).values());
}

function findLayerByName(layers, targetName) {
  const exact = layers.find((layer) => layer && layer.name === targetName);
  if (exact) {
    return { layer: exact, exact: true, suggestions: [] };
  }

  const normalizedTarget = sanitizeName(targetName);
  const scored = layers
    .filter((layer) => layer && typeof layer.name === 'string' && layer.name.trim())
    .map((layer) => {
      const normalizedName = sanitizeName(layer.name);
      let score = levenshtein(normalizedTarget, normalizedName);

      if (normalizedName === normalizedTarget) {
        score -= 100;
      } else if (
        normalizedName.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedName)
      ) {
        score -= 10;
      }

      return { layer, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((entry) => entry.layer);

  return { layer: null, exact: false, suggestions: scored };
}

function isInside(targetFrame, layerFrame) {
  if (!targetFrame || !layerFrame) {
    return false;
  }

  if (
    [targetFrame.x, targetFrame.y, targetFrame.width, targetFrame.height].some(
      (value) => typeof value !== 'number'
    )
  ) {
    return false;
  }

  if (
    [layerFrame.x, layerFrame.y, layerFrame.width, layerFrame.height].some(
      (value) => typeof value !== 'number'
    )
  ) {
    return false;
  }

  if (layerFrame.width <= 0 || layerFrame.height <= 0) {
    return false;
  }

  const targetRight = targetFrame.x + targetFrame.width;
  const targetBottom = targetFrame.y + targetFrame.height;
  const layerRight = layerFrame.x + layerFrame.width;
  const layerBottom = layerFrame.y + layerFrame.height;

  return (
    layerFrame.x >= targetFrame.x &&
    layerFrame.y >= targetFrame.y &&
    layerRight <= targetRight &&
    layerBottom <= targetBottom
  );
}

function summarizeRootLayer(rootLayer) {
  const fills = Array.isArray(rootLayer.fills) ? rootLayer.fills : [];
  const background = fills[0] && fills[0].color ? fills[0].color.value : null;

  return {
    id: rootLayer.id || null,
    name: rootLayer.name || null,
    width: rootLayer.width || null,
    height: rootLayer.height || null,
    background,
  };
}

function summarizeLayer(layer) {
  const frame = getFrame(layer);
  const fill = Array.isArray(layer.fills) ? layer.fills[0] : null;

  return {
    id: layer.id || null,
    name: layer.name || null,
    radius: layer.radius || null,
    frame: frame
      ? {
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
        }
      : null,
    fills: fill
      ? {
          color: fill.color ? fill.color.value : null,
          opacity:
            typeof fill.opacity === 'number'
              ? fill.opacity
              : fill.color && typeof fill.color.a === 'number'
                ? fill.color.a
                : null,
        }
      : null,
    font: layer.font || null,
  };
}

function pickLatestJson(projectRoot) {
  const searchDirs = [
    path.join(projectRoot, '.lanhuJson'),
    projectRoot,
  ];

  const candidates = [];
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    for (const name of fs.readdirSync(dir)) {
      if (!/^SketchJSONURL.*(?:\.json)?$/i.test(name)) {
        continue;
      }
      const fullPath = path.join(dir, name);
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        candidates.push({ path: fullPath, mtimeMs: stat.mtimeMs });
      }
    }
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!candidates.length) {
    throw new Error('No SketchJSONURL file found. Pass --file explicitly.');
  }

  return candidates[0].path;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(args['project-root'] || process.cwd());
  const jsonPath = path.resolve(args.file || pickLatestJson(projectRoot));
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  const rootLayer = getRootLayer(data);
  const rootSummary = summarizeRootLayer(rootLayer);
  const layers = getLayerPool(data);

  console.log('Root layer summary:');
  console.log(JSON.stringify(rootSummary, null, 2));
  console.log(`Layer candidates: ${layers.length}`);

  if (!args.layer) {
    console.log('No --layer provided. Use --layer "<name>" to analyze a target layer.');
    const preview = layers
      .filter((layer) => layer && typeof layer.name === 'string' && layer.name.trim())
      .slice(0, 20)
      .map((layer) => layer.name);
    console.log('Sample layer names:');
    for (const name of preview) {
      console.log(`- ${name}`);
    }
    return;
  }

  const { layer, suggestions } = findLayerByName(layers, args.layer);
  if (!layer) {
    console.error(`Layer not found: ${args.layer}`);
    if (suggestions.length) {
      console.error('Closest matches:');
      for (const item of suggestions) {
        console.error(`- ${item.name}`);
      }
    }
    process.exit(2);
  }

  const targetSummary = summarizeLayer(layer);
  console.log('Target layer summary:');
  console.log(JSON.stringify(targetSummary, null, 2));

  const targetFrame = getFrame(layer);
  const insideLayers = layers.filter((item) => {
    if (!item || item.id === layer.id || item.id === rootLayer.id) {
      return false;
    }
    return isInside(targetFrame, getFrame(item));
  });

  console.log(`Inside layer candidates: ${insideLayers.length}`);

  const outputList = [layer, ...insideLayers];
  const outputPath = path.resolve(
    args.output || path.join(projectRoot, 'containerJson.json')
  );
  fs.writeFileSync(outputPath, JSON.stringify(outputList, null, 2), 'utf8');
  console.log(`Saved candidate container layers to ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
