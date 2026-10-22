// 数字認識用のビットテンプレート
export const DIGIT_W = 12;
export const DIGIT_H = 18;

export const DIGIT_BITS: Record<string, string> = {
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

export function unpack(bits: string, w: number, h: number) {
    const grid: number[][] = [];
    for (let y = 0; y < h; y++) {
        grid.push(bits.slice(y * w, y * w + w).split("").map(c => (c === "1" ? 1 : 0)));
    }
    return grid;
}

export const DIGIT_TEMPLATES = Object.entries(DIGIT_BITS).map(([ch, bits]) => ({
    ch,
    grid: unpack(bits, DIGIT_W, DIGIT_H)
}));
export function at(img: { width: number; height: number; data: Uint8ClampedArray }, x: number, y: number) {
    const i = (y * img.width + x) * 4;
    return [img.data[i] || 0, img.data[i + 1] || 0, img.data[i + 2] || 0];
}

export function rowBands(img: { width: number; height: number; data: Uint8ClampedArray }) {
    const w = img.width, h = img.height, ys: number[] = [];
    const step = Math.max(4, Math.floor(w / 140));
    for (let y = 0; y < h; y++) {
        let close = 0, sum = 0, n = 0;
        for (let x = Math.floor(w * 0.08); x < Math.floor(w * 0.92); x += step) {
            const [r, g, b] = at(img, x, y);
            n++; sum += r;
            if (Math.abs(r - g) < 40 && Math.abs(g - b) < 40 && r >= 180) close++;
        }
        const avg = sum / Math.max(1, n);
        if (close > n * 0.70 && avg > 160) ys.push(y);
    }
    const groups: number[][] = [];
    for (const y of ys) {
        const last = groups[groups.length - 1];
        if (last && y - last[last.length - 1] <= Math.max(3, Math.floor(h / 600))) last.push(y);
        else groups.push([y]);
    }
    const lines = groups.filter(g => g[g.length - 1] - g[0] <= 8 && g[0] > h * 0.05).map(g => g[Math.floor(g.length / 2)]);
    const bands: [number, number][] = [];
    for (let i = 0; i < lines.length - 1; i++) {
        const gap = lines[i + 1] - lines[i];
        if (gap > h * 0.02 && gap < h * 0.15) bands.push([lines[i] + 2, lines[i + 1] - 2]);
    }
    return bands;
}

export function plateColor(rgb: number[]): number {
    const [r, g, b] = rgb, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx - mn;
    if (mn > 170 && sat < 40) return 1; // 白
    if (mx < 120 && sat < 40) return 2; // 黒
    if (r > 190 && g > 130 && b < 150 && g > b + 30) return 5; // 黄
    if (g > 120 && g > r + 20 && b < 180) return 6; // 緑
    if (b > 140 && b > r + 20 && b > g) return 4; // 青
    if (r > 170 && g > 70 && b < 150 && r > g + 20) return 7; // 橙
    if (r > 140 && g < 100 && b < 100) return 3; // 赤
    if (r > 150 && b > 100 && r > g) return 8; // 桃
    if (b > 110 && r > 70 && Math.abs(r - b) < 70) return 9; // 紫
    return 0;
}
import { DIGIT_W, DIGIT_H, DIGIT_TEMPLATES } from './ocr-engine'; // 上のファイル名に合わせて適宜調整してください

export function readDigit(c: { x: number; y: number; x1: number; y1: number; pts: number[][] }) {
    let bestCh = "?", bestDist = 1e9;
    const pts = c.pts; let cx = 0, cy = 0;
    for (const [px, py] of pts) { cx += px; cy += py; }
    cx = Math.floor(cx / pts.length); cy = Math.floor(cy / pts.length);
    const ox = cx - Math.floor(DIGIT_W / 2), oy = cy - Math.floor(DIGIT_H / 2);
    for (const t of DIGIT_TEMPLATES) {
        let dist = 0;
        for (let y = 0; y < DIGIT_H; y++) {
            for (let x = 0; x < DIGIT_W; x++) {
                const px = ox + x, py = oy + y;
                const inBounds = px >= c.x && px <= c.x1 && py >= c.y && py <= c.y1;
                const hasPt = inBounds && pts.some(([ppx, ppy]) => ppx === px && ppy === py);
                if (t.grid[y][x] !== (hasPt ? 1 : 0)) dist++;
            }
        }
        if (dist < bestDist) { bestDist = dist; bestCh = t.ch; }
    }
    return { ch: bestCh, dist: bestDist };
}

export function isBg(rgb: number[]) { return rgb[0] > 200 && rgb[1] > 200 && rgb[2] > 200; }
import React, { useState } from 'react';
// 必要に応じて上記のOCR関数をインポートしてください
// import { rowBands, plateColor, isBg } from '../../lib/keirin/ocr-engine';

interface PasteViewProps {
  onApply: (drafts: any[]) => void;
}

export const PasteView: React.FC<PasteViewProps> = ({ onApply }) => {
  const [statusMessage, setStatusMessage] = useState("画像をアップロードしてください");

  // OCR解析結果のデータを、ご指定の形式に変換して Zustand（appendMany）へ流し込むメイン関数
  const handleIngestAndApply = (orderData: any[], payoutData: any[]) => {
    // ご提示いただいた条件チェック
    const ready = orderData && payoutData && orderData.length > 0 && orderData.length === payoutData.length;
    
    if (!ready) {
      alert("着順と配当のデータが揃っていないか、レース数が一致しません。");
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0];

    // ご提示いただいた apply / appendMany の構造に完璧に合わせたマッピング
    const drafts = orderData.map((row, index) => {
      const pay = payoutData[index];
      const techs = row.techs || ["", "", ""];
      
      return {
        date: currentDate,
        dayLabel: "",
        raceNo: index + 1,
        first: { car: row.cars[0], name: "", tech: techs[0] },
        second: { car: row.cars[1], name: "", tech: techs[1] },
        third: { car: row.cars[2], name: "" },
        sanrentan: pay.sanrentan || 0,
        sanPop: pay.sanPop || 0,
        nirentan: pay.nirentan || 0,
        niPop: pay.niPop || 0,
      };
    });

    // 親から受け取った onApply（＝ Zustand の appendMany）を実行
    onApply(drafts);
    setStatusMessage(`${drafts.length}レース分のデータを倉庫に追加しました！`);
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4 text-white">
      <h3 className="font-bold text-base">レースデータ OCR取り込み</h3>
      <p className="text-xs text-gray-400">ステータス: {statusMessage}</p>
      
      {/* スマホからのファイル選択やドラッグ＆ドロップ用UIをここに配置 */}
      <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center">
        <p className="text-xs text-gray-400">出走表や結果の画像をここに選択・ペースト</p>
      </div>
    </div>
  );
};
