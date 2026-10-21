// BYN Race Analyzer - Complete Logic
let races = [];
let chartInstance = null;
let canvas, ctx;
let isDrawing = false;
let batchParsedData = []; // 動的一括解析用データ保持

document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  loadData();
  setDefaultDate();
  addTicketRow();
  renderAll();
  window.addEventListener('paste', handlePasteImage);
});

function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('raceDate');
  if (dateInput) dateInput.value = today;
}

const PATTERNS = [
  { id: 'B_Y_N', label: 'B & Y & N (3重複)', color: 'from-purple-600 to-indigo-600', badgeClass: 'bg-purple-900/60 text-purple-200 border-purple-500/40' },
  { id: 'B_Y', label: 'B & Y (2重複)', color: 'from-blue-600 to-cyan-600', badgeClass: 'bg-blue-900/60 text-blue-200 border-blue-500/40' },
  { id: 'Y_N', label: 'Y & N (2重複)', color: 'from-emerald-600 to-teal-600', badgeClass: 'bg-emerald-900/60 text-emerald-200 border-emerald-500/40' },
  { id: 'B_N', label: 'B & N (2重複)', color: 'from-teal-600 to-indigo-600', badgeClass: 'bg-teal-900/60 text-teal-200 border-teal-500/40' },
  { id: 'B', label: 'B のみ (1重)', color: 'from-sky-700 to-blue-800', badgeClass: 'bg-sky-900/60 text-sky-200 border-sky-500/40' },
  { id: 'Y', label: 'Y のみ (1重)', color: 'from-amber-700 to-orange-800', badgeClass: 'bg-amber-900/60 text-amber-200 border-amber-500/40' },
  { id: 'N', label: 'N のみ (1重)', color: 'from-emerald-700 to-green-800', badgeClass: 'bg-emerald-900/60 text-emerald-200 border-emerald-500/40' }
];

function getPatternKey(sites) {
  const hasB = sites.includes('B');
  const hasY = sites.includes('Y');
  const hasN = sites.includes('N');
  if (hasB && hasY && hasN) return 'B_Y_N';
  if (hasB && hasY) return 'B_Y';
  if (hasY && hasN) return 'Y_N';
  if (hasB && hasN) return 'B_N';
  if (hasB) return 'B';
  if (hasY) return 'Y';
  if (hasN) return 'N';
  return 'NONE';
}

function loadData() {
  const saved = localStorage.getItem('BYN_RACES_DATA_V2');
  if (saved) {
    try { races = JSON.parse(saved); } catch(e) { races = []; }
  }
}

function saveData() {
  localStorage.setItem('BYN_RACES_DATA_V2', JSON.stringify(races));
  renderAll();
}

// 📸 1日分スクショ画像の一括OCR処理
function processImageFiles(files) {
  const status = document.getElementById('ocrStatus');
  if (status) {
    status.classList.remove('hidden');
    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>AI/OCRで全レース情報（1R〜）を解析中...';
  }

  let combinedText = "";
  let processedCount = 0;

  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      Tesseract.recognize(e.target.result, 'jpn+eng')
        .then(({ data: { text } }) => {
          combinedText += "\n" + text;
          processedCount++;
          if (processedCount === files.length) {
            if (status) status.classList.add('hidden');
            parseBatchOcrText(combinedText);
          }
        })
        .catch(err => {
          if (status) status.classList.add('hidden');
          console.error(err);
        });
    };
    reader.readAsDataURL(file);
  });
}

// 動的レース数対応（7R・9R・12Rなど自動判定）の一括テキスト解析
function parseBatchOcrText(text) {
  batchParsedData = [];
  const lines = text.split('\n');

  // 1. 画像から「数字 + R」を動的に抽出
  const detectedRaces = new Set();
  const raceMatches = text.matchAll(/([1-9]|1[0-2])\s*R/gi);
  for (const match of raceMatches) {
    detectedRaces.add(parseInt(match[1]));
  }

  // レース番号配列（未検出時は1〜12フォールバック）
  const raceNumbers = detectedRaces.size > 0 
    ? Array.from(detectedRaces).sort((a, b) => a - b) 
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // 2. 抽出された各レースの着順・配当を解析
  raceNumbers.forEach(r => {
    let combo = "";
    let payout = 0;
    let isCanceled = false;

    const raceRegex = new RegExp(`${r}\\s*R`, 'i');
    const rIndex = lines.findIndex(l => raceRegex.test(l));

    if (rIndex !== -1) {
      const searchBlock = lines.slice(rIndex, rIndex + 5).join(' ');

      if (searchBlock.includes('中止') || searchBlock.includes('全返還')) {
        isCanceled = true;
      } else {
        // 決定着順抽出 (例: 5-1-6)
        const cMatch = searchBlock.match(/([1-9])\s*[-ー‐]\s*([1-9])\s*[-ー‐]\s*([1-9])/);
        if (cMatch) combo = `${cMatch[1]}-${cMatch[2]}-${cMatch[3]}`;

        // 配当抽出 (3連単)
        const pMatches = searchBlock.match(/([0-9,]+)\s*円/g);
        if (pMatches && pMatches.length > 0) {
          const lastPayout = pMatches[pMatches.length - 1].replace(/[^0-9]/g, '');
          payout = parseInt(lastPayout) || 0;
        }
      }
    }

    if (!isCanceled) {
      batchParsedData.push({ raceNum: r, combo, payout, isCanceled: false, sites: [] });
    }
  });

  renderBatchTable();
}

// 一括重複設定テーブルの動的描画
function renderBatchTable() {
  const container = document.getElementById('batchRaceListContainer');
  if (!container) return;

  container.innerHTML = '';
  batchParsedData.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = "p-3 bg-slate-900 border border-slate-700 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in";

    row.innerHTML = `
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <span class="font-black text-amber-400 text-sm bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">${item.raceNum}R</span>
        <div>
          <span class="text-[10px] text-slate-400 block">着順 / 配当</span>
          <span class="text-xs font-bold text-white font-mono">${item.combo || '未検出'}</span>
          <span class="text-xs font-mono text-emerald-400 ms-2">${item.payout ? item.payout.toLocaleString() + '円' : '0円'}</span>
        </div>
      </div>

      <!-- サイト重複選択ボタン -->
      <div class="flex items-center gap-2">
        <span class="text-[11px] text-slate-400 me-1">推奨サイト:</span>
        <button type="button" onclick="toggleBatchSite(${idx}, 'B')" id="batchBtn_${idx}_B" class="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-700 bg-slate-800 text-slate-400">B</button>
        <button type="button" onclick="toggleBatchSite(${idx}, 'Y')" id="batchBtn_${idx}_Y" class="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-700 bg-slate-800 text-slate-400">Y</button>
        <button type="button" onclick="toggleBatchSite(${idx}, 'N')" id="batchBtn_${idx}_N" class="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-700 bg-slate-800 text-slate-400">N</button>
        <span id="batchBadge_${idx}" class="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 font-bold ms-1">指定なし</span>
      </div>
    `;
    container.appendChild(row);
  });

  const saveSec = document.getElementById('batchSaveSection');
  if (saveSec) saveSec.classList.remove('hidden');
}

// ボタンタップで B / Y / N 切り替え
function toggleBatchSite(idx, site) {
  const item = batchParsedData[idx];
  const sIdx = item.sites.indexOf(site);
  if (sIdx >= 0) item.sites.splice(sIdx, 1);
  else item.sites.push(site);

  const btn = document.getElementById(`batchBtn_${idx}_${site}`);
  if (item.sites.includes(site)) {
    btn.className = "px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-500 bg-indigo-600 text-white shadow";
  } else {
    btn.className = "px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-700 bg-slate-800 text-slate-400";
  }

  const badge = document.getElementById(`batchBadge_${idx}`);
  const key = getPatternKey(item.sites);
  if (key === 'NONE') {
    badge.textContent = '指定なし';
    badge.className = 'text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 font-bold ms-1';
  } else {
    const pat = PATTERNS.find(p => p.id === key);
    badge.textContent = pat.label;
    badge.className = `text-[10px] px-2 py-1 rounded border font-bold ms-1 ${pat.badgeClass}`;
  }
}

// 選択した全レースを一括保存
function saveAllBatchRaces() {
  const date = document.getElementById('raceDate').value;
  const venue = document.getElementById('venue').value || '平塚';
  let savedCount = 0;

  batchParsedData.forEach(item => {
    if (item.isCanceled || item.sites.length === 0 || !item.combo) return;

    const ticketCombo = item.combo;
    const invest = 100;
    const isHit = true;
    const returnAmt = (invest / 100) * item.payout;

    races.unshift({
      id: 'race_' + Date.now() + '_' + item.raceNum,
      date: date,
      venue: venue,
      raceNum: item.raceNum,
      sites: item.sites,
      patternKey: getPatternKey(item.sites),
      roughness: '普通',
      resultCombo: item.combo,
      payoutAmount: item.payout,
      tickets: [{ combo: ticketCombo, amount: invest }],
      totalInvest: invest,
      totalReturn: returnAmt,
      isHit: isHit,
      createdAt: new Date().toISOString()
    });
    savedCount++;
  });

  if (savedCount > 0) {
    saveData();
    closeOcrModal();
    alert(`${savedCount}件のレースを一括保存・追加しました！`);
  } else {
    alert('推奨サイト（B/Y/N）が選択されているレースがありません。該当するレースのB/Y/Nボタンを押してください。');
  }
}

// 単発買い目行追加
function addTicketRow(c='', a=100) {
  const container = document.getElementById('ticketsContainer');
  if(!container) return;
  const id = 't_' + Date.now() + Math.random().toString(36).substr(2,3);
  container.insertAdjacentHTML('beforeend', `<div id="${id}" class="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-700"><input type="text" value="${c}" placeholder="5-1-6" class="ticket-combo w-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"><input type="number" value="${a}" class="ticket-amount w-1/3 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-right"><span class="text-xs text-slate-400">円</span><button type="button" onclick="document.getElementById('${id}').remove()" class="text-slate-500 hover:text-rose-400 px-1"><i class="fa-solid fa-xmark"></i></button></div>`);
}

function getTicketsFromForm() {
  const rows = document.querySelectorAll('#ticketsContainer > div');
  const res = [];
  rows.forEach(r => {
    const combo = r.querySelector('.ticket-combo').value.trim();
    const amount = parseInt(r.querySelector('.ticket-amount').value) || 0;
    if(combo && amount > 0) res.push({combo, amount});
  });
  return res;
}

function updateOverlapBadge() {
  const sites = [];
  if (document.getElementById('siteB')?.checked) sites.push('B');
  if (document.getElementById('siteY')?.checked) sites.push('Y');
  if (document.getElementById('siteN')?.checked) sites.push('N');
  const badge = document.getElementById('overlapDisplayBadge');
  if (!badge) return;
  const key = getPatternKey(sites);
  if (key === 'NONE') { badge.textContent = "選択なし"; badge.className = "text-xs px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 font-bold"; }
  else { const pat = PATTERNS.find(p => p.id === key); badge.textContent = pat.label; badge.className = `text-xs px-2.5 py-1 rounded-full border font-bold ${pat.badgeClass}`; }
}

function saveRace(e) {
  e.preventDefault();
  const sites = [];
  if (document.getElementById('siteB').checked) sites.push('B');
  if (document.getElementById('siteY').checked) sites.push('Y');
  if (document.getElementById('siteN').checked) sites.push('N');
  if (sites.length === 0) return alert('推奨サイト（B/Y/N）を選択してください');
  const tickets = getTicketsFromForm();
  if (tickets.length === 0) return alert('買い目を入力してください');
  const resultCombo = document.getElementById('resultCombo').value.trim();
  const payoutAmount = parseInt(document.getElementById('payoutAmount').value) || 0;
  let totalInvest = 0, totalReturn = 0, isHit = false;
  tickets.forEach(t => {
    totalInvest += t.amount;
    if (resultCombo && t.combo === resultCombo) { isHit = true; totalReturn += (t.amount / 100) * payoutAmount; }
  });
  
  const drawingData = canvas ? canvas.toDataURL() : '';

  races.unshift({
    id: document.getElementById('editRaceId').value || 'race_' + Date.now(),
    date: document.getElementById('raceDate').value,
    venue: document.getElementById('venue').value || '平塚',
    raceNum: document.getElementById('raceNum').value || '1',
    sites: sites, patternKey: getPatternKey(sites),
    roughness: document.querySelector('input[name="roughness"]:checked')?.value || '普通',
    resultCombo: resultCombo, payoutAmount: payoutAmount, tickets: tickets,
    totalInvest: totalInvest, totalReturn: totalReturn, isHit: isHit,
    drawingData: drawingData,
    createdAt: new Date().toISOString()
  });
  saveData(); resetForm();
}

function calculateStats() {
  const stats = {};
  PATTERNS.forEach(p => stats[p.id] = { count: 0, hits: 0, invest: 0, returnAmt: 0, hitRate: 0, roi: 0 });
  races.forEach(r => {
    const s = stats[r.patternKey];
    if (s) { s.count++; if (r.isHit) s.hits++; s.invest += r.totalInvest; s.returnAmt += r.totalReturn; }
  });
  PATTERNS.forEach(p => {
    const s = stats[p.id];
    s.hitRate = s.count > 0 ? ((s.hits / s.count) * 100).toFixed(1) : 0;
    s.roi = s.invest > 0 ? ((s.returnAmt / s.invest) * 100).toFixed(1) : 0;
  });
  return stats;
}

function renderAll() {
  const stats = calculateStats();
  renderCards(stats); renderTable(stats); renderChart(stats); renderHistory();
}

function renderCards(stats) {
  const container = document.getElementById('patternCardsContainer');
  if(!container) return; container.innerHTML = '';
  document.getElementById('totalRaceCount').textContent = `全 ${races.length} レース`;
  PATTERNS.forEach(p => {
    const s = stats[p.id];
    container.innerHTML += `<div class="bg-gradient-to-br ${p.color} p-3 rounded-2xl text-white shadow-lg flex flex-col justify-between"><div><div class="text-[10px] opacity-80 font-bold">${p.label}</div><div class="text-xl font-black">${s.roi}%</div></div><div class="text-[10px] border-t border-white/20 mt-2 pt-1 flex justify-between"><span>的中: ${s.hitRate}%</span><span>(${s.hits}/${s.count})</span></div></div>`;
  });
}

function renderTable(stats) {
  const tbody = document.getElementById('patternTableBody');
  if(!tbody) return; tbody.innerHTML = '';
  PATTERNS.forEach(p => {
    const s = stats[p.id];
    tbody.innerHTML += `<tr class="border-b border-slate-700/50"><td class="py-2 px-1 font-semibold">${p.label}</td><td class="text-center">${s.count}</td><td class="text-right text-emerald-400 font-mono">${s.hitRate}%</td><td class="text-right font-bold font-mono ${parseFloat(s.roi)>=100?'text-amber-400':'text-slate-300'}">${s.roi}%</td></tr>`;
  });
}

function renderChart(stats) {
  const canvasEl = document.getElementById('comparisonChart');
  if(!canvasEl) return;
  const ctxChart = canvasEl.getContext('2d');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctxChart, {
    type: 'bar',
    data: {
      labels: PATTERNS.map(p => p.label),
      datasets: [
        { label: '回収率 (ROI %)', data: PATTERNS.map(p => stats[p.id].roi), backgroundColor: 'rgba(99, 102, 241, 0.8)', borderRadius: 6 },
        { label: '的中率 (%)', data: PATTERNS.map(p => stats[p.id].hitRate), backgroundColor: 'rgba(16, 185, 129, 0.6)', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }
      },
      plugins: { legend: { labels: { color: '#e2e8f0', font: { size: 11 } } } }
    }
  });
}

function renderHistory() {
  const container = document.getElementById('historyList');
  if(!container) return;
  const filter = document.getElementById('filterOverlap')?.value || 'ALL';
  const filtered = races.filter(r => filter === 'ALL' || r.patternKey === filter);
  container.innerHTML = '';
  if (filtered.length === 0) { container.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">該当するデータはありません</p>'; return; }
  filtered.forEach(r => {
    const pat = PATTERNS.find(p => p.id === r.patternKey) || { label: '不明', badgeClass: 'bg-slate-700' };
    const net = r.totalReturn - r.totalInvest;
    container.innerHTML += `<div class="bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-2 animate-fade-in"><div class="flex justify-between items-center"><div class="flex items-center gap-2"><span class="text-xs px-2 py-0.5 rounded border font-bold ${pat.badgeClass}">${pat.label}</span><span class="text-xs font-bold text-white">${r.venue} ${r.raceNum}R</span><span class="text-[10px] text-slate-400">${r.date}</span></div><span class="text-xs font-bold ${r.isHit?'text-amber-400':'text-slate-400'}">${r.isHit?'🎯的中':'✕外れ'}</span></div><div class="text-xs text-slate-300 flex justify-between bg-slate-950 p-2 rounded border border-slate-800"><span>結果: ${r.resultCombo} (${r.payoutAmount}円)</span><span>純損益: <b class="${net>=0?'text-emerald-400':'text-rose-400'}">${net>0?'+':''}${net.toLocaleString()}円</b></span></div></div>`;
  });
}

function resetForm() {
  document.getElementById('raceForm').reset();
  document.getElementById('editRaceId').value = '';
  document.getElementById('ticketsContainer').innerHTML = '';
  addTicketRow();
  updateOverlapBadge();
  clearCanvas();
  setDefaultDate();
}

function initCanvas() {
  canvas = document.getElementById('handwritingCanvas');
  if(!canvas) return;
  ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3; ctx.lineCap = 'round';
  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const start = (e) => { isDrawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e) => { if (!isDrawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const stop = () => { isDrawing = false; };
  canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', stop);
  canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', move); canvas.addEventListener('touchend', stop);
}

function clearCanvas() { if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }

function exportCSV() {
  if (races.length === 0) return alert('データがありません');
  let csv = 'ID,日付,競輪場,レース,推奨サイト,パターン,荒れ度,結果着順,3連単配当,投資額,払戻額,的中\n';
  races.forEach(r => {
    csv += `"${r.id}","${r.date}","${r.venue}","${r.raceNum}","${r.sites.join('/')}","${r.patternKey}","${r.roughness}","${r.resultCombo}","${r.payoutAmount}","${r.totalInvest}","${r.totalReturn}","${r.isHit ? '1' : '0'}"\n`;
  });
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
  link.download = `byn_analyzer_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

function loadSampleData() {
  if (confirm('サンプルデータを追加しますか？')) {
    const samples = [
      { id: 's1', date: '2026-10-21', venue: '平塚', raceNum: '11', sites: ['B','Y','N'], patternKey: 'B_Y_N', roughness: '荒れ', resultCombo: '5-1-6', payoutAmount: 920, tickets: [{combo: '5-1-6', amount: 1000}], totalInvest: 1000, totalReturn: 9200, isHit: true },
      { id: 's2', date: '2026-10-21', venue: '立川', raceNum: '10', sites: ['B','Y'], patternKey: 'B_Y', roughness: '普通', resultCombo: '1-3-5', payoutAmount: 1800, tickets: [{combo: '2-4-5', amount: 1000}], totalInvest: 1000, totalReturn: 0, isHit: false }
    ];
    races = [...samples, ...races];
    saveData();
  }
}

function clearAllData() {
  if (confirm('すべてのデータを削除しますか？')) { races = []; saveData(); }
}

function openOcrModal() { document.getElementById('ocrModal').classList.remove('hidden'); }
function closeOcrModal() { document.getElementById('ocrModal').classList.add('hidden'); }
function handleImageUpload(e) { if(e.target.files.length) processImageFiles(e.target.files); }
function handlePasteImage(e) {
  const 
