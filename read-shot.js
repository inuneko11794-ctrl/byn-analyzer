import { DIGIT_BITS, DIGIT_H, DIGIT_W, TECH_BITS, TECH_H, TECH_W } from "./glyphs.js";

function unpack(bits, w, h) {
  let grid = [];
  for (let y = 0; y < h; y++) grid.push(bits.slice(y * w, y * w + w).split("").map(c => c === "1" ? 1 : 0));
  return grid;
}
const DIGIT_TEMPLATES = Object.entries(DIGIT_BITS).map(([ch, bits]) => ({ ch, grid: unpack(bits, DIGIT_W, DIGIT_H) }));
const TECH_TEMPLATES = Object.entries(TECH_BITS).map(([ch, bits]) => ({ ch, grid: unpack(bits, TECH_W, TECH_H) }));

export async function rasterOf(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0); bitmap.close();
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: image.width, height: image.height, data: image.data };
}

function at(img, x, y) {
  const i = (y * img.width + x) * 4;
  return [img.data[i] ?? 0, img.data[i + 1] ?? 0, img.data[i + 2] ?? 0];
}

function rowBands(img) {
  let w = img.width, h = img.height, ys = [], step = Math.max(4, Math.floor(w / 140));
  for (let y = 0; y < h; y++) {
    let close = 0, sum = 0, n = 0;
    for (let x = Math.floor(w * 0.08); x < Math.floor(w * 0.92); x += step) {
      let [r, g, b] = at(img, x, y); n++; sum += r;
      if (Math.abs(r - g) < 28 && Math.abs(g - b) < 28 && r >= 198 && r <= 250) close++;
    }
    let avg = sum / Math.max(1, n);
    if (close > n * 0.86 && avg > 210 && avg < 249) ys.push(y);
  }
  let groups = [];
  for (let y of ys) {
    let last = groups[groups.length - 1];
    if (last && y - last[last.length - 1] <= Math.max(3, Math.floor(h / 600))) last.push(y);
    else groups.push([y]);
  }
  let lines = groups.filter(g => g[g.length - 1] - g[0] <= 8 && g[0] > h * 0.16).map(g => g[Math.floor(g.length / 2)]);
  let bands = [];
  for (let i = 0; i < lines.length - 1; i++) {
    let gap = lines[i + 1] - lines[i];
    if (gap > h * 0.03 && gap < h * 0.12) bands.push([lines[i] + 2, lines[i + 1] - 2]);
  }
  return bands;
}

function components(img, x0, x1, y0, y1, dark) {
  let w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return [];
  let mask = new Uint8Array(w * h), seen = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let [r, g, b] = at(img, x0 + x, y0 + y);
      if (r < dark && g < dark && b < dark + 15) mask[y * w + x] = 1;
    }
  }
  let comps = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let start = y * w + x;
      if (!mask[start] || seen[start]) continue;
      let stack = [[x, y]]; seen[start] = 1;
      let pts = [];
      while (stack.length) {
        let [cx, cy] = stack.pop();
        pts.push([cx, cy]);
        for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          let ni = ny * w + nx;
          if (mask[ni] && !seen[ni]) { seen[ni] = 1; stack.push([nx, ny]); }
        }
      }
      let minX = pts[0][0], maxX = pts[0][0], minY = pts[0][1], maxY = pts[0][1];
      for (let [px, py] of pts) {
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
      comps.push({ x: minX + x0, y: minY + y0, x1: maxX + x0, y1: maxY + y0, n: pts.length, pts: pts.map(([px, py]) => [px + x0, py + y0]) });
    }
  }
  return comps;
}

function normalize(comp, w, h) {
  let bw = Math.max(1, comp.x1 - comp.x + 1), bh = Math.max(1, comp.y1 - comp.y + 1);
  let pts = new Set(comp.pts.map(([x, y]) => `${x},${y}`));
  let grid = [];
  for (let gy = 0; gy < h; gy++) {
    let row = [];
    for (let gx = 0; gx < w; gx++) {
      let sx = comp.x + Math.floor(((gx + 0.5) * bw) / w);
      let sy = comp.y + Math.floor(((gy + 0.5) * bh) / h);
      row.push(pts.has(`${sx},${sy}`) ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

function hamming(a, b) {
  let d = 0;
  for (let y = 0; y < a.length; y++) for (let x = 0; x < a[0].length; x++) if (a[y][x] !== b[y][x]) d++;
  return d;
}

function readDigit(comp) {
  let grid = normalize(comp, DIGIT_W, DIGIT_H), best = "0", dist = 1e9;
  for (let t of DIGIT_TEMPLATES) { let d = hamming(grid, t.grid); if (d < dist) { dist = d; best = t.ch; } }
  return { ch: best, dist };
}

function payoutGroups(img, y0, y1) {
  let w = img.width, rh = y1 - y0;
  let comps = components(img, Math.floor(w * 0.28), w - 2, y0 + Math.floor(rh * 0.12), y0 + Math.floor(rh * 0.9), 155).filter(c => c.n > 18 && c.y1 - c.y > rh * 0.12);
  if (!comps.length) return [];
  let heights = comps.map(c => c.y1 - c.y).sort((a, b) => a - b), med = heights[Math.floor(heights.length / 2)];
  let kept = comps.filter(c => {
    let bw = c.x1 - c.x + 1, bh = c.y1 - c.y + 1;
    if (bh > med * 1.15 && bw < bh * 0.5) return false;
    if (bw > med * 1.05) return false;
    return true;
  });
  kept.sort((a, b) => a.x - b.x);
  let groups = [];
  for (let c of kept) {
    let last = groups[groups.length - 1];
    if (!last || c.x - last[last.length - 1].x1 > w * 0.035) groups.push([c]);
    else last.push(c);
  }
  return groups;
}

function groupValue(group) {
  if (!group.length || group.length > 6) return null;
  let text = "", dist = 0;
  for (let c of group) { let dig = readDigit(c); text += dig.ch; dist = Math.max(dist, dig.dist); }
  let value = Number(text);
  if (!Number.isFinite(value)) return null;
  return { value, dist };
}

function readPayout(img) {
  let rows = [];
  for (let [y0, y1] of rowBands(img)) {
    let groups = payoutGroups(img, y0, y1);
    if (groups.length < 4) continue;
    let ni = groupValue(groups[0]), nip = groupValue(groups[1]), san = groupValue(groups[2]), sanp = groupValue(groups[3]);
    if (!ni || !san || ni.value < 100 || san.value < 100) continue;
    if (ni.dist > 90 || san.dist > 90) continue;
    rows.push({
      nirentan: ni.value,
      niPop: nip && nip.dist <= 90 && nip.value >= 1 && nip.value <= 99 ? nip.value : null,
      sanrentan: san.value,
      sanPop: sanp && sanp.dist <= 90 && sanp.value >= 1 && sanp.value <= 99 ? sanp.value : null,
    });
  }
  return rows;
}

function isBg(rgb) { return rgb[0] > 248 && rgb[1] > 248 && rgb[2] > 248; }

function plateColor(rgb) {
  let [r, g, b] = rgb, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx - mn;
  if (mn > 190 && sat < 40) return 1;
  if (mx < 110 && sat < 40) return 2;
  if (r > 200 && g > 160 && b < 140 && g > b + 40 && r > b + 60) return 5;
  if (g > 120 && g > r + 30 && g >= b && b < 180 && r < 180) return 6;
  if (b > 150 && b > r + 30 && b > g + 10) return 4;
  if (r > 180 && g > 80 && g < 200 && b < 140 && r > g + 20 && g > b) return 7;
  if (r > 150 && g < 90 && b < 90 && r > g + 60) return 3;
  if (r > 170 && g > 70 && b > 90 && r > b && b > g - 30 && sat > 40) return 8;
  if (b > 110 && r > 70 && Math.abs(r - b) < 70 && g < Math.min(r, b) - 15) return 9;
  return 0;
}

function readCars(img, y0, y1) {
  let w = img.width, rh = y1 - y0;
  let band0 = y0 + Math.floor(rh * 0.18), band1 = y0 + Math.floor(rh * 0.82);
  let col = new Array(w).fill(0);
  for (let x = 0; x < w; x++) {
    let c = 0;
    for (let y = band0; y < band1; y++) if (!isBg(at(img, x, y))) c++;
    col[x] = c;
  }
  let thresh = Math.floor((band1 - band0) * 0.42), runs = [], x = 0;
  while (x < w) {
    if (col[x] >= thresh) {
      let x0 = x;
      while (x < w && col[x] >= thresh) x++;
      if (x - x0 >= 16 && x - x0 <= Math.floor(w * 0.09)) runs.push([x0, x - 1]);
    } else x++;
  }
  let cars = [];
  for (let [x0, x1] of runs) {
    let cx = (x0 + x1) / 2;
    if (cx <= w * 0.16 || cx >= w * 0.8) continue;
    let samples = [], yy0 = band0 + Math.floor((band1 - band0) * 0.25), yy1 = band0 + Math.floor((band1 - band0) * 0.75);
    for (let yy = yy0; yy < yy1; yy++) {
      for (let xx of [x0 + 2, x0 + 3, x0 + 4, x1 - 2, x1 - 3, x1 - 4]) if (xx >= 0 && xx < w) samples.push(at(img, xx, yy));
    }
    if (!samples.length) continue;
    let med = [0, 1, 2].map(k => {
      let vals = samples.map(s => s[k]).sort((a, b) => a - b);
      return vals[Math.floor(vals.length / 2)];
    });
    let car = plateColor(med);
    if (car) cars.push(car);
  }
  if (cars.length !== 3) return null;
  return [cars[0], cars[1], cars[2]];
}

function readOrder(img) {
  let rows = [];
  for (let [y0, y1] of rowBands(img)) {
    let cars = readCars(img, y0, y1);
    if (!cars) continue;
    rows.push({ cars });
  }
  return rows;
}

export function ingestShot(img) {
  let order = readOrder(img);
  let payout = readPayout(img);
  let kind = "unknown";
  if (order.length >= 4 && order.length >= payout.length) kind = "order";
  else if (payout.length >= 4) kind = "payout";
  return { kind, order, payout };
}
