window.openPwaGuide = function() { document.getElementById('pwaModal').classList.remove('hidden'); };
window.closePwaGuide = function() { document.getElementById('pwaModal').classList.add('hidden'); };

let races = [];
let chartInstance = null;
let canvas, ctx;
let isDrawing = false;

// 読み取った「着順」と「配当」を別々に保持するオブジェクト
let arrivalMap = {}; // { 1: '5-1-6', 2: '2-5-7', ... }
let payoutMap = {};  // { 1: 920, 2: 2050, ... }

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initCanvas();
  renderAll();
  const today = new Date().toISOString().split('T')[0];
  if (document.getElementById('preRaceDate')) document.getElementById('preRaceDate').value = today;
  if (document.getElementById('raceDate')) document.getElementById('raceDate').value = today;
  window.addEventListener('paste', handlePasteImage);
});

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

function switchInputMode(mode) {
  const btnBatch = document.getElementById('tabBtnBatch');
  const btnSingle = document.getElementById('tabBtnSingle');
  const secBatch = document.getElementById('modeBatchSection');
  const secSingle = document.getElementById('modeSingleSection');

  if (mode === 'batch') {
    btnBatch.className = "px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white shadow";
    btnSingle.className = "px-4 py-2 text-xs font-bold rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600";
    secBatch.classList.remove('hidden');
    secSingle.classList.add('hidden');
  } else {
    btnSingle.className = "px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white shadow";
    btnBatch.className = "px-4 py-2 text-xs font-bold rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600";
    secSingle.classList.remove('hidden');
    secBatch.classList.add('hidden');
  }
}

// 📋 STEP 1: 予想一括保存
function savePreRaces() {
  const date = document.getElementById('preRaceDate').value;
  let addedCount = 0;

  for (let r = 1; r <= 12; r++) {
    const sites = [];
    if (document.getElementById(`pre_b_${r}`)?.checked) sites.push('B');
    if (document.getElementById(`pre_y_${r}`)?.checked) sites.push('Y');
    if (document.getElementById(`pre_n_${r}`)?.checked) sites.push('N');

    if (sites.length > 0) {
      const existingIdx = races.findIndex(item => item.raceNum == r && item.date == date);
      const raceData = {
        id: `race_${date}_${r}`,
        date: date,
        raceNum: parseInt(r),
        sites: sites,
        patternKey: getPatternKey(sites),
        resultCombo: '',
        payoutAmount: 0,
        totalInvest: 100,
        totalReturn: 0,
        isHit: false,
        status: 'PENDING'
      };

      if (existingIdx >= 0) races[existingIdx] = raceData;
      else races.unshift(raceData);
      addedCount++;
    }
  }

  if (addedCount > 0) {
    saveData();
    alert(`${addedCount}件の予想レース枠を登録しました！`);
  } else {
    alert('推奨サイト（B/Y/N）を選択してください。');
  }
}

// 🏁 ① 着順スクショ専用解析
function handleArrivalImageUpload(e) {
  if (!e.target.files.length) return;
  const status = document.getElementById('arrivalStatus');
  if(status) status.classList.remove('hidden');

  const reader = new FileReader();
  reader.onload = (event) => {
    Tesseract.recognize(event.target.result, 'jpn+eng')
      .then(({ data: { text } }) => {
        if(status) status.classList.add('hidden');
        parseArrivalText(text);
      })
      .catch(err => { if(status) status.classList.add('hidden'); console.error(err); });
  };
  reader.readAsDataURL(e.target.files[0]);
}

function parseArrivalText(text) {
  const lines = text.split('\n');
  for (let r = 1; r <= 12; r++) {
    const raceRegex = new RegExp(`(^|\\s)${r}\\s*R`, 'i');
    const rIdx = lines.findIndex(l => raceRegex.test(l));

    if (rIdx !== -1) {
      const block = lines.slice(rIdx, rIdx + 4).join(' ');
      if (block.includes('中止')) {
        arrivalMap[r] = '中止';
        continue;
      }
      const cMatch = block.match(/([1-9])\s*[-ー‐]?\s*([1-9])\s*[-ー‐]?\s*([1-9])/);
      if (cMatch) {
        arrivalMap[r] = `${cMatch[1]}-${cMatch[2]}-${cMatch[3]}`;
      }
    }
  }
  renderResultTable();
}

// 💰 ② 配当スクショ専用解析
function handlePayoutImageUpload(e) {
  if (!e.target.files.length) return;
  const status = document.getElementById('payoutStatus');
  if(status) status.classList.remove('hidden');

  const reader = new FileReader();
  reader.onload = (event) => {
    Tesseract.recognize(event.target.result, 'jpn+eng')
      .then(({ data: { text } }) => {
        if(status) status.classList.add('hidden');
        parsePayoutText(text);
      })
      .catch(err => { if(status) status.classList.add('hidden'); console.error(err); });
  };
  reader.readAsDataURL(e.target.files[0]);
}

function parsePayoutText(text) {
  const lines = text.split('\n');
  for (let r = 1; r <= 12; r++) {
    const raceRegex = new RegExp(`(^|\\s)${r}\\s*R`, 'i');
    const rIdx = lines.findIndex(l => raceRegex.test(l));

    if (rIdx !== -1) {
      const block = lines.slice(rIdx, rIdx + 4).join(' ');
      if (block.includes('全返還') || block.includes('中止')) {
        payoutMap[r] = 0;
        continue;
      }
      const pMatches = block.match(/([0-9,]+)\s*円/g);
      if (pMatches && pMatches.length > 0) {
        const lastAmtStr = pMatches[pMatches.length - 1].replace(/[^0-9]/g, '');
        payoutMap[r] = parseInt(lastAmtStr) || 0;
      }
    }
  }
  renderResultTable();
}

function handlePasteImage(e) {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      const dt = new DataTransfer();
      dt.items.add(file);
      handleArrivalImageUpload({ target: { files: dt.files } });
      break;
    }
  }
}

// ✨ 合致判定テーブル描画 (リアルタイム)
function renderResultTable() {
  const container = document.getElementById('parsedResultContainer');
  if (!container) return;
  container.innerHTML = '';

  const allRaces = Array.from(new Set([...Object.keys(arrivalMap), ...Object.keys(payoutMap)]))
                        .map(n => parseInt(n))
                        .sort((a, b) => a - b);

  if (allRaces.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">上の2つの枠にスクショを貼ると、合致状態がリアルタイムで表示されます。</p>';
    return;
  }

  allRaces.forEach(r => {
    const combo = arrivalMap[r] || '';
    const payout = payoutMap[r] !== undefined ? payoutMap[r] : '';

    const hasCombo = combo !== '';
    const hasPayout = payout !== '';
    const isMatched = hasCombo && hasPayout;

    let badgeHtml = '';
    if (isMatched) {
      badgeHtml = '<span class="text-[10px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full shadow animate-pulse">✨ 合致成功！</span>';
    } else if (hasCombo) {
      badgeHtml = '<span class="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-700 px-1.5 py-0.5 rounded font-bold">🏁 着順あり (配当待ち)</span>';
    } else if (hasPayout) {
      badgeHtml = '<span class="text-[9px] bg-teal-950 text-teal-300 border border-teal-700 px-1.5 py-0.5 rounded font-bold">💰 配当あり (着順待ち)</span>';
    }

    const row = document.createElement('div');
    row.className = `p-2 bg-slate-800 border ${isMatched ? 'border-emerald-500' : 'border-slate-700'} rounded-xl flex items-center justify-between text-xs animate-fade-in`;
    row.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="font-black text-amber-400 text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-700">${r}R</span>
        ${badgeHtml}
      </div>
      <div class="flex items-center gap-2">
        <span>🏁 <input type="text" value="${combo}" id="res_combo_${r}" class="w-16 bg-slate-900 border border-indigo-500/50 rounded text-center text-white font-mono font-bold py-0.5"></span>
        <span>💰 <input type="number" value="${payout}" id="res_payout_${r}" class="w-20 bg-slate-900 border border-emerald-500/50 rounded text-right text-white font-mono font-bold py-0.5">円</span>
      </div>
    `;
    container.appendChild(row);
  });
}

// 🎯 データ反映
function applyResultsToRaces() {
  let updatedCount = 0;
  const date = document.getElementById('preRaceDate')?.value || new Date().toISOString().split('T')[0];
  const allRaces = Array.from(new Set([...Object.keys(arrivalMap), ...Object.keys(payoutMap)]));

  allRaces.forEach(r => {
    const combo = document.getElementById(`res_combo_${r}`)?.value || arrivalMap[r] || '';
    const payoutInput = document.getElementById(`res_payout_${r}`)?.value;
    const payout = payoutInput !== '' ? parseInt(payoutInput) : (payoutMap[r] || 0);

    if (!combo) return;

    let target = races.find(item => item.raceNum == r && item.date == date);
    
    // 予想が登録されていないレースは「予想なし（NONE）」で保存
    if (!target) {
      target = {
        id: `race_${date}_${r}`,
        date: date,
        raceNum: parseInt(r),
        sites: [],
        patternKey: 'NONE',
        resultCombo: '',
        payoutAmount: 0,
        totalInvest: 100,
        totalReturn: 0,
        isHit: false,
        status: 'PENDING'
      };
      races.unshift(target);
    }

    target.resultCombo = combo;
    target.payoutAmount = payout;
    target.isHit = combo !== '中止';
    target.totalReturn = combo === '中止' ? 100 : (target.totalInvest / 100) * payout;
    target.status = 'COMPLETED';
    updatedCount++;
  });

  if (updatedCount > 0) {
    saveData();
    alert(`${updatedCount}件のレース結果を反映・確定しました！`);
  } else {
    alert('反映する結果データがありません。スクショを貼ってください。');
  }
}

// 🖊️ 単発・手書き機能
function updateOverlapBadge() {
  const sites = [];
  if (document.getElementById('siteB')?.checked) sites.push('B');
  if (document.getElementById('siteY')?.checked) sites.push('Y');
  if (document.getElementById('siteN')?.checked) sites.push('N');
  const badge = document.getElementById('overlapDisplayBadge');
  if (!badge) return;
  const key = getPatternKey(sites);
  if (key === 'NONE') { badge.textContent = "予想なし (記録のみ)"; badge.className = "text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-bold"; }
  else { const pat = PATTERNS.find(p => p.id === key); badge.textContent = pat.label; badge.className = `text-xs px-2.5 py-0.5 rounded-full border font-bold ${pat.badgeClass}`; }
}

function saveSingleRace(e) {
  e.preventDefault();
  const sites = [];
  if (document.getElementById('siteB').checked) sites.push('B');
  if (document.getElementById('siteY').checked) sites.push('Y');
  if (document.getElementById('siteN').checked) sites.push('N');

  const resultCombo = document.getElementById('resultCombo').value.trim();
  const payoutAmount = parseInt(document.getElementById('payoutAmount').value) || 0;
  const drawingData = canvas ? canvas.toDataURL() : '';

  races.unshift({
    id: 'race_' + Date.now(),
    date: document.getElementById('raceDate').value,
    raceNum: parseInt(document.getElementById('raceNum').value || '1'),
    sites: sites,
    patternKey: getPatternKey(sites),
    resultCombo: resultCombo,
    payoutAmount: payoutAmount,
    totalInvest: 100,
    totalReturn: resultCombo ? payoutAmount : 0,
    isHit: !!resultCombo,
    drawingData: drawingData,
    status: resultCombo ? 'COMPLETED' : 'PENDING'
  });

  saveData();
  resetSingleForm();
  alert('レースを保存しました！');
}

function resetSingleForm() {
  document.getElementById('raceForm').reset();
  updateOverlapBadge();
  clearCanvas();
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

function calculateStats() {
  const stats = {};
  PATTERNS.forEach(p => stats[p.id] = { count: 0, hits: 0, invest: 0, returnAmt: 0, hitRate: 0, roi: 0 });
  races.forEach(r => {
    const s = stats[r.patternKey];
    if (s && r.resultCombo) {
      s.count++;
      if (r.isHit) s.hits++;
      s.invest += r.totalInvest;
      s.returnAmt += r.totalReturn;
    }
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
  if (filtered.length === 0) { container.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">登録済みのデータはありません</p>'; return; }
  filtered.forEach(r => {
    const pat = PATTERNS.find(p => p.id === r.patternKey) || { label: '⚪ 予想なし (記録のみ)', badgeClass: 'bg-slate-700 text-slate-300 border-slate-600' };
    const net = r.totalReturn - r.totalInvest;
    container.innerHTML += `<div class="bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-2 animate-fade-in"><div class="flex justify-between items-center"><div class="flex items-center gap-2"><span class="text-xs px-2 py-0.5 rounded border font-bold ${pat.badgeClass}">${pat.label}</span><span class="text-xs font-bold text-white">${r.raceNum}R</span><span class="text-[10px] text-slate-400">${r.date}</span></div><span class="text-xs font-bold ${r.resultCombo ? (r.isHit ? 'text-amber-400' : 'text-slate-400') : 'text-indigo-400'}">${r.resultCombo ? (r.isHit ? '🎯的中' : '✕外れ') : '⏳結果待ち'}</span></div><div class="text-xs text-slate-300 flex justify-between bg-slate-950 p-2 rounded border border-slate-800"><span>結果: ${r.resultCombo || '未入力'} (${r.payoutAmount || 0}円)</span><span>損益: <b class="${net>=0?'text-emerald-400':'text-rose-400'}">${net>0?'+':''}${net.toLocaleString()}円</b></span></div></div>`;
  });
}

function exportCSV() {
  if (races.length === 0) return alert('データがありません');
  let csv = 'ID,日付,レース,推奨サイト,パターン,結果着順,3連単配当,投資額,払戻額,的中\n';
  races.forEach(r => {
    csv += `"${r.id}","${r.date}","${r.raceNum}","${r.sites.join('/')}","${r.patternKey}","${r.resultCombo}","${r.payoutAmount}","${r.totalInvest}","${r.totalReturn}","${r.isHit ? '1' : '0'}"\n`;
  });
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
  link.download = `byn_analyzer_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

function loadSampleData() {
  if (confirm('サンプルデータを追加しますか？')) {
    races = [
      { id: 's1', date: '2026-10-21', raceNum: 1, sites: ['B','Y','N'], patternKey: 'B_Y_N', resultCombo: '5-1-6', payoutAmount: 920, totalInvest: 100, totalReturn: 920, isHit: true, status: 'COMPLETED' },
      { id: 's2', date: '2026-10-21', raceNum: 2, sites: ['B','Y'], patternKey: 'B_Y', resultCombo: '2-4-5', payoutAmount: 2050, totalInvest: 100, totalReturn: 0, isHit: false, status: 'COMPLETED' }
    ];
    saveData();
  }
}

function clearAllData() {
  if (confirm('すべてのデータを削除しますか？')) { races = []; saveData(); }
}
