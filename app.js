window.openPwaGuide = function() { document.getElementById('pwaModal').classList.remove('hidden'); };
window.closePwaGuide = function() { document.getElementById('pwaModal').classList.add('hidden'); };

let races = [];
let chartInstance = null;
let canvas, ctx;
let isDrawing = false;
let parsedResultsMap = {}; // { 1: { combo: '5-1-6', payout: 920 }, ... }

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initCanvas();
  addTicketRow();
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

// タブ切替
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
  const venue = document.getElementById('preRaceVenue').value || '平塚';
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
        venue: venue,
        raceNum: parseInt(r),
        sites: sites,
        patternKey: getPatternKey(sites),
        resultCombo: '',
        payoutAmount: 0,
        tickets: [],
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

// 🏁 ① 着順スクショ解析
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
      const cMatch = block.match(/([1-9])\s*[-ー‐]?\s*([1-9])\s*[-ー‐]?\s*([1-9])/);
      if (cMatch) {
        if (!parsedResultsMap[r]) parsedResultsMap[r] = { combo: '', payout: 0 };
        parsedResultsMap[r].combo = `${cMatch[1]}-${cMatch[2]}-${cMatch[3]}`;
      }
    }
  }
  renderResultTable();
}

// 💰 ② 配当スクショ解析
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
      const pMatches = block.match(/([0-9,]+)\s*円/g);
      if (pMatches && pMatches.length > 0) {
        const lastAmtStr = pMatches[pMatches.length - 1].replace(/[^0-9]/g, '');
        const amt = parseInt(lastAmtStr) || 0;
        if (!parsedResultsMap[r]) parsedResultsMap[r] = { combo: '', payout: 0 };
        parsedResultsMap[r].payout = amt;
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

function renderResultTable() {
  const container = document.getElementById('parsedResultContainer');
  if (!container) return;
  container.innerHTML = '';

  const rKeys = Object.keys(parsedResultsMap).sort((a, b) => parseInt(a) - parseInt(b));
  if (rKeys.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">上の2つの枠にスクショを貼ると一覧表示されます。</p>';
    return;
  }

  rKeys.forEach(r => {
    const data = parsedResultsMap[r];
    const matchedRace = races.find(item => item.raceNum == r);
    const isMatched = !!matchedRace;

    const row = document.createElement('div');
    row.className = `p-2 bg-slate-800 border ${isMatched ? 'border-emerald-500/50' : 'border-amber-500/30'} rounded-xl flex items-center justify-between text-xs animate-fade-in`;
    row.innerHTML = `
      <div class="flex items-center gap-1.5">
        <span class="font-black text-amber-400 text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-700">${r}R</span>${isMatched ? '<span class="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-bold">予想合致</span>' : '<span class="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-bold">予想なし(別枠保存)</span>'}
      </div>
      <div class="flex items-center gap-2">
        <span>🏁 <input type="text" value="${data.combo}" id="res_combo_${r}" class="w-16 bg-slate-900 border border-indigo-500/50 rounded text-center text-white font-mono font-bold py-0.5"></span>
        <span>💰 <input type="number" value="${data.payout}" id="res_payout_${r}" class="w-20 bg-slate-900 border border-emerald-500/50 rounded text-right text-white font-mono font-bold py-0.5">円</span>
      </div>
    `;
    container.appendChild(row);
  });
}

// 🎯 未登録レースも「予想なし」として自動保存する強力機能
function applyResultsToRaces() {
  let updatedCount = 0;
  const rKeys = Object.keys(parsedResultsMap);
  const date = document.getElementById('preRaceDate')?.value || new Date().toISOString().split('T')[0];
  const venue = document.getElementById('preRaceVenue')?.value || '平塚';

  rKeys.forEach(r => {
    const combo = document.getElementById(`res_combo_${r}`)?.value || parsedResultsMap[r].combo;
    const payout = parseInt(document.getElementById(`res_payout_${r}`)?.value) || parsedResultsMap[r].payout;

    if (!combo) return;

    let target = races.find(item => item.raceNum == r && item.date == date);
    
    // もし事前にSTEP 1で予想が登録されていなければ「予想なし（NONE）」として新規作成！
    if (!target) {
      target = {
        id: `race_${date}_${r}`,
        date: date,
        venue: venue,
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
    target.isHit = true;
    target.totalReturn = (target.totalInvest / 100) * payout;
    target.status = 'COMPLETED';
    updatedCount++;
  });

  if (updatedCount > 0) {
    saveData();
    alert(`${updatedCount}件のレース結果（予想なし枠含む）を反映・確定しました！`);
  } else {
    alert('反映する結果データがありません。スクショを貼ってください。');
  }
}

// 🖊️ 詳細・単発登録用の機能 (多点買い & 手書き)
function addTicketRow(c='', a=100) {
  const container = document.getElementById('ticketsContainer');
  if(!container) return;
  const id = 't_' + Date.now() + Math.random().toString(36).substr(2,3);
  container.insertAdjacentHTML('beforeend', `<div id="${id}" class="flex items
