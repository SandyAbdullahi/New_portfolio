// model-animations.js
import * as THREE from 'three';

/* ---------------- helpers ---------------- */
function logSceneTree(root, { showDims = true } = {}) {
  const lines = [];
  root.traverse((o) => {
    const depth = (() => {
      let d = 0, p = o.parent;
      while (p) { d++; p = p.parent; }
      return d;
    })();
    let dim = '';
    if (showDims && o.isMesh) {
      const b = new THREE.Box3().setFromObject(o);
      const s = b.getSize(new THREE.Vector3());
      dim = `  [${s.x.toFixed(2)} × ${s.y.toFixed(2)} × ${s.z.toFixed(2)}]`;
    }
    lines.push(`${'  '.repeat(depth)}- ${o.type}${o.name ? ` "${o.name}"` : ''}${dim}`);
  });
  // eslint-disable-next-line no-console
  console.groupCollapsed('%c[panel3d] Scene graph', 'color:#6E8256;font-weight:bold;');
  console.log(lines.join('\n'));
  console.groupEnd();
}

function findByNames(root, namesCsv) {
  const wanted = namesCsv.split(',').map(s => s.trim()).filter(Boolean);
  const out = [];
  root.traverse(o => { if (o.name && wanted.includes(o.name)) out.push(o); });
  return out;
}

function compileRegex(pattern) {
  try {
    // allow "/foo|bar/i" or "foo|bar"
    return pattern.startsWith('/') && pattern.lastIndexOf('/') > 0
      ? new RegExp(pattern.slice(1, pattern.lastIndexOf('/')),
                   pattern.slice(pattern.lastIndexOf('/') + 1))
      : new RegExp(pattern, 'i');
  } catch { return /gear|cog|pinion|wheel/i; }
}

function findByRegex(root, pattern) {
  const re = compileRegex(pattern);
  const out = [];
  root.traverse(o => { if (o.name && re.test(o.name)) out.push(o); });
  return out;
}

function approxDims(obj) {
  const b = new THREE.Box3().setFromObject(obj);
  const s = b.getSize(new THREE.Vector3());
  return s;
}

/** Heuristic: choose “round plate” meshes (X≈Y, both > Z). */
function autoDetectGears(root, { max = 12, xyTolerance = 0.18, minFlatness = 1.4 } = {}) {
  const cand = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const s = approxDims(o);
    const xyEqual = Math.abs(s.x - s.y) / Math.max(s.x, s.y, 1e-6) <= xyTolerance;
    const flatish  = Math.max(s.x, s.y) / Math.max(s.z, 1e-6) >= minFlatness;
    if (xyEqual && flatish) {
      const radius = Math.max(s.x, s.y) * 0.5;
      cand.push({ obj: o, radius });
    }
  });
  cand.sort((a,b) => b.radius - a.radius);
  return cand.slice(0, max).map(c => c.obj);
}

function axisVecKey(axis) {
  const a = (axis || 'z').toLowerCase();
  return a === 'x' ? 'x' : a === 'y' ? 'y' : 'z';
}

/* ---------------- hook into app.js event ---------------- */
addEventListener('panel3d:modelLoaded', (e) => {
  const { container, viewer, gltf, modelURL } = e.detail || {};
  if (!container || !viewer || !viewer.root) return;

  const root = viewer.root;

  // Optional: dump the tree so you can see real names
  if (container.dataset.logTree === 'true') {
    logSceneTree(root, { showDims: true });
  }

  // If built-in animations exist & you didn't force procedural, do nothing
  const forceProcedural = container.dataset.forceProcedural === 'true'
                       || container.dataset.useBuiltInAnim === 'false';
  if (gltf.animations?.length && !forceProcedural) return;

  // 1) Try explicit names, then regex, then auto-detect
  let gears = [];
  if (container.dataset.gearNames) {
    gears = findByNames(root, container.dataset.gearNames);
  }
  if (!gears.length && container.dataset.gearMatch) {
    gears = findByRegex(root, container.dataset.gearMatch);
  }
  if (!gears.length && (container.dataset.gearAuto ?? 'true') !== 'false') {
    gears = autoDetectGears(root, {
      max: parseInt(container.dataset.gearCount || '12', 10),
      xyTolerance: parseFloat(container.dataset.gearTolerance || '0.18'),
      minFlatness: parseFloat(container.dataset.gearFlatness || '1.4'),
    });
  }

  if (!gears.length) {
    console.warn('[panel3d] No gear-like nodes found for', modelURL,
      '— set data-gear-names, data-gear-match, or data-gear-auto="true" and data-log-tree="true" to inspect.');
    return;
  }

  // 2) Build procedural rotation set
  const axisKey = axisVecKey(container.dataset.gearAxis);
  const base    = parseFloat(container.dataset.gearSpeed || '2.0'); // rad/s
  const altDir  = (container.dataset.gearAlternateDir ?? 'true') !== 'false';

  const radii   = gears.map(g => Math.max(...Object.values(approxDims(g))) * 0.5 || 1);
  const rMax    = Math.max(...radii) || 1;

  const items = gears.map((g, i) => {
    const R   = Math.max(...Object.values(approxDims(g))) * 0.5 || 1;
    const dir = altDir ? (i % 2 === 0 ? 1 : -1) : 1;
    const w   = base * (rMax / R) * dir; // inverse radius → believable gearing
    return { obj: g, omega: w };
  });

  console.info(`[panel3d] Animating ${items.length} gear-like meshes on "${axisKey}" axis:`,
               items.map(it => it.obj.name || '(unnamed)'));

  // 3) Register per-frame ticker
  const ticker = (dt) => {
    for (const it of items) {
      it.obj.rotation[axisKey] += it.omega * dt;
    }
  };
  viewer.tickers.push(ticker);
});
