var DIGIT_W = 12;
var DIGIT_H = 18;
var TECH_W = 16;
var TECH_H = 16;
var DIGIT_BITS = {
  "0": "000011110000001111111100011100001110011000000110110000000011110000000011110000000011110000000011110000000011110000000011110000000011110000000011110000000011111000000011011000000110011100000110001111111100000111111000",
  "1": "000000000111000111111111111111111111111110001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111",
  "2": "000011100000011111111100011100011100011000001110110000000110110000000110000000001110000000001100000000011100000000011000000000110000000001100000000011000000000110000000011100000000011100000000111111111111111111111111",
  "3": "000011110000011111111100011100001110011000000110000000000110000000000110000000000110000011111100000011111000000011111100000000000110000000000110000000000011111000000110011000000110011100001110001111111100000011110000",
  "4": "000000011000000000111100000000111100000000111100000001001100000011001100000011001100000110001100001100001100011100001100011000001100011000001100111111111111111111111111000000001100000000001100000000001100000000001100",
  "5": "011111111110011111111110011000000000011000000000010000000000010000000000011111111000111100111100000000001110000000000110000000000111000000000011000000000011110000000110110000000110111000001110001111111100000111110000",
  "6": "000000111100000111111000001111000000001110000000011000000000011000000000010001111000111111111100111100001110111000000110110000000011110000000011110000000011111000000011011000000011011100000110001111111100000111111000",
  "7": "111111111111011111111111000000000110000000000110000000001110000000001100000000001100000000011000000000110000000000110000000000110000000000110000000001100000000011000000000011000000000011000000000111000000000110000000",
  "8": "000011110000011110011100011100001100011000001110011000000110011000000110011100001100011100011100001111111100011110011100011100001110011000000110110000000011110000000011011000000110011100001110011111111100000011100000",
  "9": "000000000000001111111100011100011100011000000110110000000011110000000011110000000011110000000011011000000011011110011111001111111111000111110011000000000010000000000110000000011100000000111100001111111000000111000000"
};
var TECH_BITS = {
  "逃": "0000000010010000011000001001000000110110100100100011011010010100000000101001110000000000100100000000000010010000111100011001110000110111100100100011000110010000001100010001000000110011000100100011011000011110001100000000000011001110000000110000000111111110",
  "捲": "0011000000100000001100011010001000100001001000110111101101100001111110011111111000110000010011000011000001001100001100111111111100111001100000101111001111111111001100111111111100100000100001000011000010011100001100001000000000110000100000010110000001111110",
  "差": "0000100000011000000011000011000001111111111111100000011111001000000000011000000000111111111111100000000110000000000000111000000011111111111111110001100000000000000110011111110000010011111111100011000001000000001100000100000001100000010000001100111111111110",
  "マ": "1111111111111110111111111111111100000000000001100000000000001110000000000001110000000000000110000000000000011000000110000110000000011100111000000000011111000000000001111000000000000011100000000000000111000000000000001110000000000000011000000000000000100000"
};

var DIGIT_TEMPLATES = Object.entries(DIGIT_BITS).map(([ch, bits]) => ({ ch, grid: unpack(bits, DIGIT_W, DIGIT_H) }));
var TECH_TEMPLATES = Object.entries(TECH_BITS).map(([ch, bits]) => ({ ch, grid: unpack(bits, TECH_W, TECH_H) }));
function unpack(bits, w, h) {
  const grid = [];
  for (let y = 0; y < h; y++) grid.push(bits.slice(y * w, y * w + w).split("").map((c) => c === "1" ? 1 : 0));
  return grid;
}
function at(img, x, y) {
  const i = (y * img.width + x) * 4;
  return [img.data[i] ?? 0, img.data[i + 1] ?? 0, img.data[i + 2] ?? 0];
}
function rowBands(img) {
  const { width: w, height: h } = img;
  const ys = [];
  const step = Math.max(4, Math.floor(w / 140));
  for (let y = 0; y < h; y++) {
    let close = 0;
    let sum = 0;
    let n = 0;
    for (let x = Math.floor(w * 0.08); x < Math.floor(w * 0.92); x += step) {
      const [r, g, b] = at(img, x, y);
      n += 1;
      sum += r;
      if (Math.abs(r - g) < 28 && Math.abs(g - b) < 28 && r >= 198 && r <= 250) close += 1;
    }
    const avg = sum / Math.max(1, n);
    if (close > n * 0.86 && avg > 210 && avg < 249) ys.push(y);
  }
  const groups = [];
  for (const y of ys) {
    const last = groups[groups.length - 1];
    if (last && y - last[last.length - 1] <= Math.max(3, Math.floor(h / 600))) last.push(y);
    else groups.push([y]);
  }
  const lines = groups.filter((g) => g[g.length - 1] - g[0] <= 8 && g[0] > h * 0.16).map((g) => g[Math.floor(g.length / 2)]);
  const bands = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const gap = lines[i + 1] - lines[i];
    if (gap > h * 0.03 && gap < h * 0.12) bands.push([lines[i] + 2, lines[i + 1] - 2]);
  }
  return bands;
}
function components(img, x0, x1, y0, y1, dark) {
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return [];
  const mask = new Uint8Array(w * h);
  const seen = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = at(img, x0 + x, y0 + y);
      if (r < dark && g < dark && b < dark + 15) mask[y * w + x] = 1;
    }
  }
  const comps = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (!mask[start] || seen[start]) continue;
      const stack = [[x, y]];
      seen[start] = 1;
      const pts = [];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        pts.push([cx, cy]);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (mask[ni] && !seen[ni]) {
            seen[ni] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      let minX = pts[0][0];
      let maxX = pts[0][0];
      let minY = pts[0][1];
      let maxY = pts[0][1];
      for (const [px, py] of pts) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      comps.push({
        x: minX + x0,
        y: minY + y0,
        x1: maxX + x0,
        y1: maxY + y0,
        n: pts.length,
        pts: pts.map(([px, py]) => [px + x0, py + y0])
      });
    }
  }
  return comps;
}
function normalize(comp, w, h) {
  const bw = Math.max(1, comp.x1 - comp.x + 1);
  const bh = Math.max(1, comp.y1 - comp.y + 1);
  const pts = new Set(comp.pts.map(([x, y]) => `\( {x}, \){y}`));
  const grid = [];
  for (let gy = 0; gy < h; gy++) {
    const row = [];
    for (let gx = 0; gx < w; gx++) {
      const sx = comp.x + Math.floor((gx + 0.5) * bw / w);
      const sy = comp.y + Math.floor((gy + 0.5) * bh / h);
      row.push(pts.has(`\( {sx}, \){sy}`) ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}
function hamming(a, b) {
  let d = 0;
  for (let y = 0; y < a.length; y++) {
    for (let x = 0; x < a[0].length; x++) if (a[y][x] !== b[y][x]) d += 1;
  }
  return d;
}
function readDigit(comp) {
  const grid = normalize(comp, DIGIT_W, DIGIT_H);
  let best = "0";
  let dist = 1e9;
  for (const t of DIGIT_TEMPLATES) {
    const d = hamming(grid, t.grid);
    if (d < dist) {
      dist = d;
      best = t.ch;
    }
  }
  return { ch: best, dist };
}
function payoutGroups(img, y0, y1) {
  const w = img.width;
  const rh = y1 - y0;
  const comps = components(img, Math.floor(w * 0.28), w - 2, y0 + Math.floor(rh * 0.12), y0 + Math.floor(rh * 0.9), 155).filter(
    (c) => c.n > 18 && c.y1 - c.y > rh * 0.12
  );
  if (!comps.length) return [];
  const heights = comps.map((c) => c.y1 - c.y).sort((a, b) => a - b);
  const med = heights[Math.floor(heights.length / 2)];
  const kept = comps.filter((c) => {
    const bw = c.x1 - c.x + 1;
    const bh = c.y1 - c.y + 1;
    if (bh > med * 1.15 && bw < bh * 0.5) return false;
    if (bw > med * 1.05) return false;
    return true;
  });
  kept.sort((a, b) => a.x - b.x);
  const groups = [];
  for (const c of kept) {
    const last = groups[groups.length - 1];
    if (!last || c.x - last[last.length - 1].x1 > w * 0.035) groups.push([c]);
    else last.push(c);
  }
  return groups;
}
function groupValue(group) {
  if (!group.length || group.length > 6) return null;
  let text = "";
  let dist = 0;
  for (const c of group) {
    const digit = readDigit(c);
    text += digit.ch;
    dist = Math.max(dist, digit.dist);
  }
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return { value, dist };
}
function readPayout(img) {
  const rows = [];
  for (const [y0, y1] of rowBands(img)) {
    const groups = payoutGroups(img, y0, y1);
    if (groups.length < 4) continue;
    const ni = groupValue(groups[0]);
    const nip = groupValue(groups[1]);
    const san = groupValue(groups[2]);
    const sanp = groupValue(groups[3]);
    if (!ni || !san || ni.value < 100 || san.value < 100) continue;
    if (ni.dist > 90 || san.dist > 90) continue;
    rows.push({
      nirentan: ni.value,
      niPop: nip && nip.dist <= 90 && nip.value >= 1 && nip.value <= 99 ? nip.value : null,
      sanrentan: san.value,
      sanPop: sanp && sanp.dist <= 90 && sanp.value >= 1 && sanp.value <= 99 ? sanp.value : null
    });
  }
  return rows;
}
function isBg(rgb) {
  return rgb[0] > 248 && rgb[1] > 248 && rgb[2] > 248;
}
function plateColor(rgb) {
  const [r, g, b] = rgb;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx - mn;
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
  const w = img.width;
  const rh = y1 - y0;
  const band0 = y0 + Math.floor(rh * 0.18);
  const band1 = y0 + Math.floor(rh * 0.82);
  const col = new Array(w).fill(0);
  for (let x2 = 0; x2 < w; x2++) {
    let c = 0;
    for (let y = band0; y < band1; y++) if (!isBg(at(img, x2, y))) c += 1;
    col[x2] = c;
  }
  const thresh = Math.floor((band1 - band0) * 0.42);
  const runs = [];
  let x = 0;
  while (x < w) {
    if (col[x] >= thresh) {
      const x0 = x;
      while (x < w && col[x] >= thresh) x += 1;
      if (x - x0 >= 16 && x - x0 <= Math.floor(w * 0.09)) runs.push([x0, x - 1]);
    } else x += 1;
  }
  const cars = [];
  for (const [x0, x1] of runs) {
    const cx = (x0 + x1) / 2;
    if (cx <= w * 0.16 || cx >= w * 0.8) continue;
    const samples = [];
    const yy0 = band0 + Math.floor((band1 - band0) * 0.25);
    const yy1 = band0 + Math.floor((band1 - band0) * 0.75);
    for (let yy = yy0; yy < yy1; yy++) {
      for (const xx of [x0 + 2, x0 + 3, x0 + 4, x1 - 2, x1 - 3, x1 - 4]) {
        if (xx >= 0 && xx < w) samples.push(at(img, xx, yy));
      }
    }
    if (!samples.length) continue;
    const med = [0, 1, 2].map((k) => {
      const vals = samples.map((s) => s[k]).sort((a, b) => a - b);
      return vals[Math.floor(vals.length / 2)];
    });
    const car = plateColor(med);
    if (car) cars.push(car);
  }
  if (cars.length !== 3) return null;
  return [cars[0], cars[1], cars[2]];
}
function readTechs(img, y0, y1) {
  const w = img.width;
  const rh = y1 - y0;
  const xStart = Math.floor(w * 0.7);
  const ww = w - xStart;
  const mask = new Uint8Array(ww * rh);
  const seen = new Uint8Array(ww * rh);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < ww; x++) {
      const [r, g, b] = at(img, xStart + x, y0 + y);
      if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r >= 225 && r <= 246) mask[y * ww + x] = 1;
    }
  }
  const chips = [];
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < ww; x++) {
      const start = y * ww + x;
      if (!mask[start] || seen[start]) continue;
      const stack = [[x, y]];
      seen[start] = 1;
      const pts = [];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        pts.push([cx, cy]);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= ww || ny >= rh) continue;
          const ni = ny * ww + nx;
          if (mask[ni] && !seen[ni]) {
            seen[ni] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      if (pts.length < 40) continue;
      let minX = pts[0][0];
      let maxX = pts[0][0];
      let minY = pts[0][1];
      let maxY = pts[0][1];
      for (const [px, py] of pts) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      chips.push([minX + xStart, minY + y0, maxX + xStart, maxY + y0]);
    }
  }
  chips.sort((a, b) => a[0] - b[0]);
  const techs = [];
  for (const [x0, cy0, x1, cy1] of chips) {
    const ink = [];
    for (let y = cy0; y <= cy1; y++) {
      for (let x = x0; x <= x1; x++) {
        const [r, g, b] = at(img, x, y);
        if (r < 80 && g < 80 && b < 80) ink.push([x, y]);
      }
    }
    if (ink.length < 8) continue;
    let minX = ink[0][0];
    let maxX = ink[0][0];
    let minY = ink[0][1];
    let maxY = ink[0][1];
    for (const [px, py] of ink) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    const grid = normalize({ x: minX, y: minY, x1: maxX, y1: maxY, n: ink.length, pts: ink }, TECH_W, TECH_H);
    let best = "";
    let dist = 1e9;
    for (const t of TECH_TEMPLATES) {
      const d = hamming(grid, t.grid);
      if (d < dist) {
        dist = d;
        best = t.ch;
      }
    }
    techs.push(dist <= 100 ? best : "");
  }
  return [techs[0] ?? "", techs[1] ?? ""];
}
function readOrder(img) {
  const rows = [];
  for (const [y0, y1] of rowBands(img)) {
    const cars = readCars(img, y0, y1);
    if (!cars) continue;
    rows.push({ cars, techs: readTechs(img, y0, y1) });
  }
  return rows;
}
function ingestShot(img) {
  const order = readOrder(img);
  const payout = readPayout(img);
  let kind = "unknown";
  if (order.length >= 4 && order.length >= payout.length) kind = "order";
  else if (payout.length >= 4) kind = "payout";
  return { kind, order, payout };
          }
