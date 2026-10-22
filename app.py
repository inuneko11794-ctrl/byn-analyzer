import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="BYN Race Analyzer", layout="wide", initial_sidebar_state="collapsed")

html_code = r"""
<!DOCTYPE html>
<html lang="ja" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BYN Race Analyzer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Teko:wght@600;700&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Noto Sans JP', sans-serif; background-color: #080c14; color: #f3f4f6; }
        .number-font { font-family: 'Teko', sans-serif; letter-spacing: 0.05em; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #080c14; }
        ::-webkit-scrollbar-thumb { background: #1f293d; border-radius: 4px; }
        .dropzone-order { border-color: #8b5cf6; background-color: rgba(139, 92, 246, 0.05); }
        .dropzone-payout { border-color: #10b981; background-color: rgba(16, 185, 129, 0.05); }
    </style>
</head>
<body class="min-h-screen pb-12 flex flex-col">
    <header class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2">
            <span class="number-font text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-yellow-300">BYN ANALYZER</span>
        </div>
        <button onclick="openOcrModal()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold rounded-lg flex items-center gap-1 shadow-lg">
            <i class="fa-solid fa-camera"></i> 画像読取
        </button>
    </header>

    <main class="flex-1 max-w-7xl w-full mx-auto px-4 pt-6 space-y-6">
        <!-- Tabs -->
        <div class="flex border-b border-slate-800 space-x-4">
            <button id="tab-dashboard-btn" onclick="switchTab('dashboard')" class="px-4 py-2 text-sm font-bold border-b-2 border-blue-500 text-blue-400">ダッシュボード</button>
            <button id="tab-records-btn" onclick="switchTab('records')" class="px-4 py-2 text-sm font-bold border-b-2 border-transparent text-gray-400">レース履歴 (<span id="record-count">0</span>)</button>
        </div>

        <!-- Dashboard Section -->
        <section id="tab-dashboard" class="space-y-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <span class="text-xs text-gray-400">総登録数</span>
                    <div id="stat-races" class="number-font text-3xl font-bold text-white">0</div>
                </div>
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <span class="text-xs text-gray-400">総損益</span>
                    <div id="stat-profit" class="number-font text-3xl font-bold text-white">¥0</div>
                </div>
            </div>
        </section>

        <!-- Records Section -->
        <section id="tab-records" class="hidden space-y-3">
            <div id="records-container" class="space-y-3"></div>
        </section>
    </main>

    <!-- OCR Modal -->
    <div id="ocr-modal" class="fixed inset-0 bg-black/90 z-[100] hidden flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full flex flex-col p-5 space-y-4 shadow-2xl">
            <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                    <i class="fa-solid fa-camera text-emerald-400"></i> 着順 & 配当 2枠一括読取
                </h3>
                <button onclick="closeOcrModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <p class="text-xs text-gray-400">上側に「着順」、下側に「配当」のスクショを貼ってください。一致すると直接履歴に保存できます。</p>
            
            <div class="grid grid-cols-2 gap-3">
                <div id="dropzone-order" class="dropzone-order border-2 border-dashed rounded-xl p-4 text-center cursor-pointer min-h-[100px] flex flex-col items-center justify-center" onclick="document.getElementById('file-order').click()">
                    <input type="file" id="file-order" accept="image/*" class="hidden" onchange="handleFile(event, 'order')">
                    <i class="fa-solid fa-list-ol text-xl text-purple-400 mb-1"></i>
                    <p class="text-xs font-bold text-purple-200">1. 着順のスクショ</p>
                    <p class="text-[10px] text-gray-500" id="desc-order">未選択</p>
                </div>
                <div id="dropzone-payout" class="dropzone-payout border-2 border-dashed rounded-xl p-4 text-center cursor-pointer min-h-[100px] flex flex-col items-center justify-center" onclick="document.getElementById('file-payout').click()">
                    <input type="file" id="file-payout" accept="image/*" class="hidden" onchange="handleFile(event, 'payout')">
                    <i class="fa-solid fa-yen-sign text-xl text-emerald-400 mb-1"></i>
                    <p class="text-xs font-bold text-emerald-200">2. 配当のスクショ</p>
                    <p class="text-[10px] text-gray-500" id="desc-payout">未選択</p>
                </div>
            </div>

            <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 min-h-[80px]">
                <div id="ocr-preview" class="text-xs text-gray-500 text-center py-2">両方の画像を読み込むとここに結果が表示されます</div>
            </div>

            <div class="flex justify-between items-center pt-2">
                <span id="ocr-status" class="text-xs text-gray-400 font-bold">状態: 画像待ち</span>
                <div class="flex gap-2">
                    <button onclick="closeOcrModal()" class="px-3 py-2 bg-slate-800 text-xs font-bold rounded-lg text-gray-300">キャンセル</button>
                    <button id="ocr-save-btn" onclick="saveOcrResults()" disabled class="px-4 py-2 bg-emerald-600 disabled:opacity-40 text-xs font-bold rounded-lg text-white shadow-lg">履歴に直接追加する</button>
                </div>
            </div>
        </div>
    </div>
    <script>
        let races = [];
        let orderData = [], payoutData = [];

        const DIGIT_W = 12, DIGIT_H = 18;
        const DIGIT_BITS = {
            "0": "000011110000001111111100011100001110011000000110110000000011110000000011110000000011110000000011110000000011110000000011110000000011110000000011111000000011011000000110011100000110001111111100000111111000",
            "1": "000000000111000111111111111111111111111110001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111",
            "2": "0000111000000111111111000111000111000110000011101100000001101100000001100000000011100000000011000000000111000000000110000000001100000000011000000000110000000011100000000011100000000111111111111111111111111",
            "3": "000011110000011111111100011100001110011000000110000000000110000000000110000000000110000011111100000011111000000011111100000000000110000000000110000000000111110000000110011000000110011100001110001111111100000011110000",
            "4": "000000011000000000111100000000111100000000111100000001001100000011001100000011001100000110001100001100001100011100001100011000001100011000001100111111111111111111111111000000001100000000001100000000001100000000001100",
            "5": "011111111110011111111110011000000000011000000000010000000000010000000000011111111000111100111100000000001110000000000110000000000111000000000011000000000011110000000110110000000110111000001110001111111100000111110000",
            "6": "000000111100000111111000001111000000001110000000011000000000011000000000010001111000111111111100111100001110111000000110110000000011110000000011110000000011111000000011011000000011011100000110001111111100000111111000",
            "7": "111111111111011111111111000000000110000000000110000000001110000000001100000000001100000000011000000000110000000000110000000000110000000001100000000011000000000110000000001100000000011100000000011000000",
            "8": "000011110000011110011100011100001100011000001110011000000110011000000110011100001100011100011100001111111100011110011100011100001110011000000110110000000011110000000011011000000110011100001110011111111100000011100000",
            "9": "000000000000001111111100011100011100011000000110110000000011110000000011110000000011110000000011011000000011011110011111001111111111000111110011000000000010000000000110000000011100000000111100001111111000000111000000"
        };
        function unpack(bits, w, h) { return Array.from({length: h}, (_, y) => bits.slice(y * w, y * w + w).split("").map(c => c === "1" ? 1 : 0)); }
        const TEMPLATES = Object.entries(DIGIT_BITS).map(([ch, bits]) => ({ ch, grid: unpack(bits, DIGIT_W, DIGIT_H) }));
        function at(img, x, y) { const i = (y * img.width + x) * 4; return [img.data[i] || 0, img.data[i+1] || 0, img.data[i+2] || 0]; }

        function rowBands(img) {
            const w = img.width, h = img.height, ys = [];
            for (let y = 0; y < h; y++) {
                let close = 0, sum = 0, n = 0;
                for (let x = Math.floor(w * 0.1); x < Math.floor(w * 0.9); x += 4) {
                    const [r, g, b] = at(img, x, y); n++; sum += r;
                    if (Math.abs(r - g) < 40 && Math.abs(g - b) < 40 && r >= 180) close++;
                }
                if (close > n * 0.7 && sum/n > 160) ys.push(y);
            }
            const groups = [];
            for (const y of ys) {
                const l = groups[groups.length - 1];
                if (l && y - l[l.length - 1] <= 3) l.push(y); else groups.push([y]);
            }
            const lines = groups.filter(g => g[g.length-1]-g[0] <= 8 && g[0] > h*0.05).map(g => g[Math.floor(g.length/2)]);
            const bands = [];
            for (let i = 0; i < lines.length - 1; i++) {
                if (lines[i+1] - lines[i] > h*0.02 && lines[i+1] - lines[i] < h*0.15) bands.push([lines[i]+2, lines[i+1]-2]);
            }
            return bands;
        }

        function comps(img, x0, x1, y0, y1) {
            const w = x1 - x0, h = y1 - y0, mask = new Uint8Array(w * h), seen = new Uint8Array(w * h);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const [r, g, b] = at(img, x0 + x, y0 + y);
                    if (r < 160 && g < 160 && b < 175) mask[y * w + x] = 1;
                }
            }
            const res = [];
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const s = y * w + x;
                    if (!mask[s] || seen[s]) continue;
                    const stack = [[x, y]], pts = []; seen[s] = 1;
                    while(stack.length) {
                        const [cx, cy] = stack.pop(); pts.push([cx, cy]);
                        for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                            const nx = cx+dx, ny = cy+dy;
                            if(nx>=0 && ny>=0 && nx<w && ny<h) {
                                const ni = ny*w+nx;
                                if(mask[ni] && !seen[ni]) { seen[ni]=1; stack.push([nx, ny]); }
                            }
                        }
                    }
                    let minX = pts[0][0], maxX = pts[0][0], minY = pts[0][1], maxY = pts[0][1];
                    for(const [px, py] of pts) {
                        if(px<minX)minX=px; if(px>maxX)maxX=px; if(py<minY)minY=py; if(py>maxY)maxY=py;
                    }
                    res.push({ x: minX+x0, y: minY+y0, x1: maxX+x0, y1: maxY+y0, n: pts.length, pts: pts.map(([px, py]) => [px+x0, py+y0]) });
                }
            }
            return res;
        }

        function readDigit(c) {
            let best = "?", minDist = 1e9;
            let cx = 0, cy = 0; for(const [px, py] of c.pts){cx+=px; cy+=py;}
            cx = Math.floor(cx/c.pts.length); cy = Math.floor(cy/c.pts.length);
            const ox = cx - Math.floor(DIGIT_W/2), oy = cy - Math.floor(DIGIT_H/2);
            for(const t of TEMPLATES) {
                let dist = 0;
                for(let y=0; y<DIGIT_H; y++) {
                    for(let x=0; x<DIGIT_W; x++) {
                        const px = ox+x, py = oy+y;
                        const has = px>=c.x && px<=c.x1 && py>=c.y && py<=c.y1 && c.pts.some(([ppx, ppy]) => ppx===px && ppy===py);
                        if(t.grid[y][x] !== (has?1:0)) dist++;
                    }
                }
                if(dist < minDist) { minDist = dist; best = t.ch; }
            }
            return { ch: best, dist: minDist };
        }

        function readPayout(img) {
            const rows = [];
            for (const [y0, y1] of rowBands(img)) {
                const cs = comps(img, Math.floor(img.width*0.1), img.width-2, y0, y1).filter(c => c.n > 8);
                if (!cs.length) continue;
                const groups = [];
                cs.sort((a,b)=>a.x-b.x).forEach(c => {
                    const l = groups[groups.length-1];
                    if(!l || c.x - l[l.length-1].x1 > img.width*0.05) groups.push([c]); else l.push(c);
                });
                const vals = [];
                for(const g of groups) {
                    let txt = ""; let maxD = 0;
                    for(const c of g) { const d = readDigit(c); txt += d.ch; maxD = Math.max(maxD, d.dist); }
                    const v = Number(txt);
                    if(maxD <= 150 && v >= 100) vals.push(v);
                }
                if(vals.length >= 2) rows.push({ nirentan: vals[0], sanrentan: vals[vals.length-1] });
                else if(vals.length === 1) rows.push({ nirentan: 0, sanrentan: vals[0] });
            }
            return rows;
        }

        function plateColor(rgb) {
            const [r, g, b] = rgb, mx = Math.max(r,g,b), mn = Math.min(r,g,b), sat = mx - mn;
            if (mn > 170 && sat < 40) return 1; // 白
            if (mx < 120 && sat < 40) return 2; // 黒
            if (r > 190 && g > 130 && b < 150) return 5; // 黄
            if (g > 120 && g > r+20) return 6; // 緑
            if (b > 140 && b > r+20) return 4; // 青
            if (r > 170 && g > 70 && b < 150) return 7; // 橙
            if (r > 140 && g < 100) return 3; // 赤
            if (r > 150 && b > 100) return 8; // 桃
            if (b > 110 && r > 70) return 9; // 紫
            return 0;
        }

        function readOrder(img) {
            const rows = [];
            for (const [y0, y1] of rowBands(img)) {
                const w = img.width;
                const cs = comps(img, Math.floor(w*0.05), Math.floor(w*0.95), y0, y1).filter(c => c.n > 20);
                if(cs.length < 3) continue;
                // 色判定の簡易抽出
                const cars = [];
                for(let i=0; i<3; i++) {
                    const c = cs[i];
                    const [r, g, b] = at(img, Math.floor((c.x+c.x1)/2), Math.floor((c.y+c.y1)/2));
                    cars.push(plateColor([r,g,b]));
                }
                if(cars.length >= 3) rows.push({ cars });
            }
            return rows;
        }

        function handleFile(e, type) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const cvs = document.createElement('canvas'); cvs.width = img.width; cvs.height = img.height;
                    const ctx = cvs.getContext('2d'); ctx.drawImage(img, 0, 0);
                    const raster = { width: cvs.width, height: cvs.height, data: ctx.getImageData(0, 0, cvs.width, cvs.height).data };
                    
                    if(type === 'order') {
                        orderData = readOrder(raster);
                        document.getElementById('desc-order').textContent = `${orderData.length}レース取得`;
                    } else {
                        payoutData = readPayout(raster);
                        document.getElementById('desc-payout').textContent = `${payoutData.length}レース取得`;
                    }
                    checkMatch();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }

        function checkMatch() {
            const prev = document.getElementById('ocr-preview'), status = document.getElementById('ocr-status'), btn = document.getElementById('ocr-save-btn');
            if(orderData.length > 0 && payoutData.length > 0 && orderData.length === payoutData.length) {
                status.textContent = `準備完了 (${orderData.length}レース一致)`;
                btn.removeAttribute('disabled');
                prev.innerHTML = '';
                for(let i=0; i<orderData.length; i++) {
                    prev.innerHTML += `<div class="flex justify-between text-xs py-1 border-b border-slate-900"><span class="text-yellow-400">${i+1}R</span><span>着順:${orderData[i].cars.join('-')}</span><span class="text-emerald-400">2連:¥${payoutData[i].nirentan} / 3連:¥${payoutData[i].sanrentan}</span></div>`;
                }
            } else {
                status.textContent = "画像待ち / レース数不一致";
                btn.setAttribute('disabled', 'true');
            }
        }

        function saveOcrResults() {
            if(orderData.length === 0 || orderData.length !== payoutData.length) return;
            const newRecords = [];
            const today = new Date().toISOString().split('T')[0];
            for(let i=0; i<orderData.length; i++) {
                newRecords.push({
                    id: 'RACE_' + Date.now() + '_' + i,
                    date: today,
                    raceIdStr: `${i+1}R`,
                    sites: [], patternKey: 'NONE', tickets: [], totalInvest: 0,
                    resultCombo: orderData[i].cars.join('-'),
                    nirentanAmount: payoutData[i].nirentan,
                    payoutAmount: payoutData[i].sanrentan,
                    isHit: false, totalReturn: 0, timestamp: Date.now() + i
                });
            }
            races = [...newRecords, ...races];
            localStorage.setItem('BYN_RACE_DATA', JSON.stringify(races));
            closeOcrModal(); renderRecords();
            alert(`${newRecords.length}レース分を履歴に直接追加しました！`);
        }

        function openOcrModal() { document.getElementById('ocr-modal').classList.remove('hidden'); }
        function closeOcrModal() { document.getElementById('ocr-modal').classList.add('hidden'); }
        function switchTab(id) {
            ['dashboard', 'records'].forEach(t => {
                document.getElementById('tab-'+t).classList.toggle('hidden', t !== id);
            });
        }
        function renderRecords() {
            const cont = document.getElementById('records-container'); cont.innerHTML = '';
            races.forEach(r => {
                cont.innerHTML += `<div class="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs flex justify-between"><span>${r.date} ${r.raceIdStr}</span><span>着順:${r.resultCombo}</span><span>3連:¥${r.payoutAmount}</span></div>`;
            });
            document.getElementById('record-count').textContent = races.length;
        }
    </script>
</body>
</html>
"""

components.html(html_code, height=900, scrolling=True)
