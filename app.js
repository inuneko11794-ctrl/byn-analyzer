// 万車ノート - KEIRIN LEDGER Logic

let selectedDayTag = '初日';
let parsedRacesMap = {}; // { 1: { combo: [5,1,6], payout: 920 }, ... }
let savedDataList = JSON.parse(localStorage.getItem('KEIRIN_NOTE_DATA') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('targetDate').value = today;
  renderSavedHistory();

  // ドロップ＆ドラッグ対応
  const dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-[#2c2a29]'); });
  dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('border-[#2c2a29]'); });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-[#2c2a29]');
    if (e.dataTransfer.files.length) handleMultipleFiles(Array.from(e.dataTransfer.files));
  });

  // クリップボードからのコピペ貼り付け対応
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    const files = [];
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) files.push(item.getAsFile());
    }
    if (files.length) handleMultipleFiles(files);
  });
});

function selectDay(btn, dayLabel) {
  selectedDayTag = dayLabel;
  document.querySelectorAll('.day-btn').forEach(b => {
    b.className = "day-btn px-3 py-1.5 rounded-full text-xs font-bold bg-white text-[#6e675e] border border-[#d8cfc0] hover:bg-[#e8e2d5] transition";
  });
  btn.className = "day-btn px-3 py-1.5 rounded-full text-xs font-bold bg-[#2c2a29] text-white transition";
}

function handleMultipleImages(e) {
  if (e.target.files.length) {
    handleMultipleFiles(Array.from(e.target.files));
  }
}

// 複数画像を一括読み取り＆着順/払戻を自動判定
async function handleMultipleFiles(files) {
  const idleState = document.getElementById('dropIdleState');
  const loadingState = document.getElementById('dropLoadingState');
  idleState.classList.add('hidden');
  loadingState.classList.remove('hidden');

  parsedRacesMap = {};
  let countArrivalRaces = 0;
  let countPayoutRaces = 0;

  for (let file of files) {
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'jpn+eng');
      const lines = text.split('\n');

      // 着順画像か払戻画像かを判定
      const isArrival = lines.some(l => l.includes('着順') || l.includes('決まり手') || l.includes('逃') || l.includes('差') || l.includes('マ'));
      
      let currentR = 1;

      lines.forEach(line => {
        if (isArrival) {
          // 着順解析
          const cMatch = line.match(/([1-9])\s*[-ー‐]?\s*([1-9])\s*[-ー‐]?\s*([1-9])/);
          if (cMatch && currentR <= 12) {
            if (!parsedRacesMap[currentR]) parsedRacesMap[currentR] = { combo: [], payout: 0 };
            parsedRacesMap[currentR].combo = [parseInt(cMatch[1]), parseInt(cMatch[2]), parseInt(cMatch[3])];
            currentR++;
            countArrivalRaces++;
          }
        } else {
          // 払戻解析
          const pMatches = line.match(/([0-9,]+)\s*円/g);
          if (pMatches && pMatches.length > 0 && currentR <= 12) {
            const val = parseInt(pMatches[pMatches.length - 1].replace(/[^0-9]/g, '')) || 0;
            if (!parsedRacesMap[currentR]) parsedRacesMap[currentR] = { combo: [], payout: 0 };
            parsedRacesMap[currentR].payout = val;
            currentR++;
            countPayoutRaces++;
          }
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  loadingState.classList.add('hidden');
  idleState.classList.remove('hidden');

  // バッジ & UI反映
  renderParsedRacesUI(countArrivalRaces, countPayoutRaces);
}

// 画面へ綺麗に展開描画
function renderParsedRacesUI(arrCount, payCount) {
  const badgeArea = document.getElementById('badgeStatusArea');
  const badgeArr = document.getElementById('badgeArrival');
  const badgePay = document.getElementById('badgePayout');
  const msgText = document.getElementById('statusMessageText');
  const cardList = document.getElementById('raceCardList');
  const submitBtn = document.getElementById('submitBtn');

  badgeArea.classList.remove('hidden');
  badgeArr.textContent = `着順 ${arrCount || Object.keys(parsedRacesMap).length}`;
  badgePay.textContent = `払戻 ${payCount || Object.keys(parsedRacesMap).length}`;
  msgText.textContent = `着順 ${arrCount}レース、払戻 ${payCount}レース`;

  cardList.innerHTML = '';
  const rKeys = Object.keys(parsedRacesMap).map(Number).sort((a,b) => a - b);

  if (rKeys.length === 0) {
    cardList.innerHTML = '<p class="text-xs text-[#8c857b] text-center py-4">画像からデータを読み取れませんでした</p>';
    submitBtn.disabled = true;
    return;
  }

  rKeys.forEach(r => {
    const item = parsedRacesMap[r];
    const c = item.combo || [];
    const p = item.payout || 0;

    const num1Html = c[0] ? `<span class="num-badge car-${c[0]}">${c[0]}</span>` : '-';
    const num2Html = c[1] ? `<span class="num-badge car-${c[1]}">${c[1]}</span>` : '-';
    const num3Html = c[2] ? `<span class="num-badge car-${c[2]}">${c[2]}</span>` : '-';

    cardList.innerHTML += `
      <div class="bg-[#ede7dc]/80 border border-[#e2d9ca] rounded-xl p-3 flex justify-between items-center shadow-sm">
        <div class="flex items-center gap-3">
          <span class="font-bold text-xs text-[#5c554a] w-6">${r}R</span>
          <div class="flex items-center gap-1">
            ${num1Html}
            <span class="text-xs text-[#a0988c] font-bold">-</span>
            ${num2Html}
            <span class="text-xs text-[#a0988c] font-bold">-</span>
            ${num3Html}
          </div>
        </div>
        <div class="text-right">
          <span class="font-black text-sm text-[#2c2a29] font-mono">${p ? p.toLocaleString() + '円' : '-'}</span>
        </div>
      </div>
    `;
  });

  submitBtn.disabled = false;
}

// 「この内容を足す」押下時の保存処理
function applyAndSaveRaces() {
  const targetDate = document.getElementById('targetDate').value;
  const rKeys = Object.keys(parsedRacesMap);

  if (rKeys.length === 0) return;

  const newEntry = {
    id: Date.now(),
    date: targetDate,
    dayTag: selectedDayTag,
    races: parsedRacesMap
  };

  savedDataList.unshift(newEntry);
  localStorage.setItem('KEIRIN_NOTE_DATA', JSON.stringify(savedDataList));

  // リセット
  parsedRacesMap = {};
  document.getElementById('badgeStatusArea').classList.add('hidden');
  document.getElementById('raceCardList').innerHTML = '';
  document.getElementById('submitBtn').disabled = true;

  renderSavedHistory();
  alert('万車ノートに記録を追加しました！');
}

// 履歴描画
function renderSavedHistory() {
  const container = document.getElementById('savedHistoryList');
  if (!container) return;

  if (savedDataList.length === 0) {
    container.innerHTML = '<p class="text-xs text-[#8c857b] text-center py-6">保存された記録はありません</p>';
    return;
  }

  container.innerHTML = '';
  savedDataList.forEach(entry => {
    const rKeys = Object.keys(entry.races);
    container.innerHTML += `
      <div class="bg-white border border-[#e2d9ca] rounded-2xl p-4 shadow-sm space-y-2">
        <div class="flex justify-between items-center border-b border-[#f0eafe] pb-2">
          <div class="flex items-center gap-2">
            <span class="bg-[#2c2a29] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">${entry.dayTag}</span>
            <span class="font-bold text-xs text-[#2c2a29]">${entry.date}</span>
          </div>
          <span class="text-xs text-[#8c857b] font-bold">${rKeys.length}レース記録</span>
        </div>
        <div class="text-xs text-[#5c554a] space-y-1 pt-1">
          ${rKeys.map(r => {
            const item = entry.races[r];
            const cStr = item.combo.length ? item.combo.join('-') : '未決定';
            return `<div class="flex justify-between"><span>${r}R :${cStr}</span><span class="font-bold">${item.payout ? item.payout.toLocaleString() + '円' : '-'}</span></div>`;
          }).join('')}
        </div>
      </div>
    `;
  });
}

function loadSampleData() {
  parsedRacesMap = {
    1: { combo: [5, 1, 6], payout: 920 },
    2: { combo: [2, 5, 7], payout: 2050 },
    3: { combo: [3, 7, 5], payout: 580 }
  };
  renderParsedRacesUI(3, 3);
}

function clearAllData() {
  if (confirm('すべての万車ノートのデータを削除しますか？')) {
    savedDataList = [];
    localStorage.removeItem('KEIRIN_NOTE_DATA');
    renderSavedHistory();
  }
}
