// BYN Analyzer - 1枠動画風OCR自動合体 Logic

let races = [];
let chartInstance = null;
let parsedResultsMap = {}; // { 1: { combo: [5,1,6], payout: 920 }, ... }

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderAll();
  const today = new Date().toISOString().split('T')[0];
  if (document.getElementById('preRaceDate')) document.getElementById('preRaceDate').value = today;

  // ドラッグ＆ドロップ対応
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-emerald-400'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('border-emerald-400'); });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-emerald-400');
      if (e.dataTransfer.files.length) handleMultipleFiles(Array.from(e.dataTransfer.files));
    });
  }

  // クリップボード貼り付け対応
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    const files = [];
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) files.push(item.getAsFile());
    }
    if (files.length) handleMultipleFiles(files);
  });
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

// STEP 1: 予想枠の一括登録
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

// 🌟 動画風 1枠複数ファイル一括処理
function handleMultipleImages(e) {
  if (e.target.files.length) handleMultipleFiles(Array.from(e.target.files));
}

async function handleMultipleFiles(files) {
  const idleState = document.getElementById('dropIdleState');
  const loadingState = document.getElementById('dropLoadingState');
  if(idleState) idleState.classList.add('hidden');
  if(loadingState) loadingState.classList.remove('hidden');

  let arrCount = 0;
  let payCount = 0;

  for (let file of files) {
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'jpn+eng');
      const lines = text.split('\n');

      const isArrival = lines.some(l => l.includes('着順') || l.includes('決まり手') || l.includes('逃') || l.includes('差') || l.includes('マ'));

      let currentR = 1;
      lines.forEach(line => {
        if (isArrival) {
          const cMatch = line.match(/([1-9])\s*[-ー‐]?\s*([1-9])\s*[-ー‐]?\s*([1-9])/);
          if (cMatch && currentR <= 12) {
            if (!parsedResultsMap[currentR]) parsedResultsMap[currentR] = { combo: [], payout: 0 };
            parsedResultsMap[currentR].combo = [parseInt(cMatch[1]), parseInt(cMatch[2]), parseInt(cMatch[3])];
            currentR++;
            arrCount++;
          }
        } else {
          const pMatches = line.match(/([0-9,]+)\s*円/g);
          if (pMatches && pMatches.length > 0 && currentR <= 12) {
            const val = parseInt(pMatches[pMatches.length - 1].replace(/[^0-9]/g, '')) || 0;
            if (!parsedResultsMap[currentR]) parsedResultsMap[currentR] = { combo: [], payout: 0 };
            parsedResultsMap[currentR].payout = val;
            currentR++;
            payCount++;
          }
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  if(loadingState) loadingState.classList.add('hidden');
  if(idleState) idleState.classList.remove('hidden');

  renderParsedRacesUI(arrCount, payCount);
}

// プレビュー描画 (車番カラーバッジ付き)
function renderParsedRacesUI(arrCount, payCount) {
  const badgeArea = document.getElementById('badgeStatusArea');
  const badgeArr = document.getElementById('badgeArrival');
  const badgePay = document.getElementById('badgePayout');
  const msgText = document.getElementById('statusMessageText');
  const container = document.getElementById('parsedResultContainer');
  const submitBtn = document.getElementById('submitBtn');

  if(badgeArea) badgeArea.classList.remove('hidden');
  if(badgeArr) badgeArr.textContent = `着順 ${arrCount || Object.keys(parsedResultsMap).length}`;
  if(badgePay) badgePay.textContent = `払戻 ${payCount || Object.keys(parsedResultsMap).length}`;
  if(msgText) msgText.textContent = `着順 ${arrCount}件、払戻 ${payCount}件を合体`;

  if (!container) return;
  container.innerHTML = '';

  const rKeys = Object.keys(parsedResultsMap).map(Number).sort((a,b) => a - b);

  if (rKeys.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">上の枠にスクショを貼ると一覧表示されます。</p>';
    if(submitBtn) submitBtn.disabled = true;
    return;
  }

  rKeys.forEach(r => {
    const item = parsedResultsMap[r];
    const c = item.combo || [];
    const p = item.payout || 0;

    const num1Html = c[0] ? `<span class="num-badge car-${c[0]}">${c[0]}</span>` : '-';
    const num2Html = c[1] ? `<span class="num-badge car-${c[1]}">${c[1]}</span>` : '-';
    const num3Html = c[2] ? `<span class="num-badge car-${c[2]}">${c[2]}</span>` : '-';

    container.innerHTML += `
      <div class="p-2 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between text-xs animate-fade-in">
        <div class="flex items-center gap-2">
          <span class="font-black text-amber-400 text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700">${r}R</span>
          <div class="flex items-center gap-1">
            ${num1Html}
            <span class="text-[10px] text-slate-500 font-bold">-</span>
            ${num2Html}
            <span class="text-[10px] text-slate-500 font-bold">-</span>
            ${num3Html}
          </div>
        </div>
        <div class="font-mono font-bold text-emerald-400">
          ${p ? p.toLocaleString() + '円' : '-'}
        </div>
      </div>
    `;
  });

  if(submitBtn) submitBtn.disabled = false;
}

// 🎯 成績確定・反映
function applyResultsToRaces() {
  let updatedCount = 0;
  const date = document.getElementById('preRaceDate')?.value || new Date().toISOString().split('T')[0];
  const rKeys = Object.keys(parsedResultsMap);

  rKeys.forEach(r => {
    const item = parsedResultsMap[r];
    const comboStr = item.combo.length ? item.combo.join('-') : '';
    const payout = item.payout || 0;

    if (!comboStr) return;

    let target = races.find(x => x.raceNum == r && x.date == date);
    
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

    target.resultCombo = comboStr;
    target.payoutAmount = payout;
    target.isHit = true;
    target.totalReturn = (target.totalInvest / 100) * payout;
    target.status = 'COMPLETED';
    updatedCount++;
  });

  if (updatedCount > 0) {
    saveData();
    alert(`${updatedCount}件のレース結果を確定・計算しました！`);
  } else {
    alert('反映する結果データがありません。');
  }
}

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
