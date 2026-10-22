import streamlit as st
import streamlit.components.v1 as components

# スマホでも見やすくするため画面を広く使う設定
st.set_page_config(page_title="BYN Race Analyzer", layout="wide", initial_sidebar_state="collapsed")

# ---------------------------------------------------------
# 新・爆速OCR ＆ 2画面合体直接保存版 HTMLコード
# ---------------------------------------------------------
html_code = """
<!DOCTYPE html>
<html lang="ja" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BYN Race Analyzer - 2画面合体直接保存版</title>

    <!-- PWA & Mobile Web App Meta Tags -->
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#080c14">

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Teko:wght@600;700&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">

    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        byn: { dark: '#080c14', card: '#111827', border: '#1f293d', accent: '#2563eb' }
                    },
                    fontFamily: {
                        teko: ['Teko', 'sans-serif'],
                        noto: ['Noto Sans JP', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Noto Sans JP', sans-serif; background-color: #080c14; color: #f3f4f6; }
        .number-font { font-family: 'Teko', sans-serif; letter-spacing: 0.05em; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #080c14; }
        ::-webkit-scrollbar-thumb { background: #1f293d; border-radius: 4px; }
        canvas { touch-action: none; }
        /* 読み込み枠の色分け用 */
        .dropzone-order { border-color: #8b5cf6; background-color: rgba(139, 92, 246, 0.05); }
        .dropzone-order:hover { border-color: #a78bfa; background-color: rgba(139, 92, 246, 0.1); }
        .dropzone-payout { border-color: #10b981; background-color: rgba(16, 185, 129, 0.05); }
        .dropzone-payout:hover { border-color: #34d399; background-color: rgba(16, 185, 129, 0.1); }
    </style>
</head>
<body class="min-h-screen pb-12 flex flex-col">

    <!-- Header Navigation -->
    <header class="bg-byn-card border-b border-byn-border sticky top-0 z-50 shadow-xl backdrop-blur-md bg-opacity-95">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="bg-gradient-to-r from-blue-600 via-yellow-500 to-pink-500 p-0.5 rounded-xl shadow-lg">
                    <div class="bg-byn-dark px-3 py-1 rounded-[10px]">
                        <span class="number-font text-3xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-yellow-300 to-pink-400">BYN</span>
                    </div>
                </div>
                <div>
                    <h1 class="text-base sm:text-lg font-extrabold text-white leading-tight flex items-center gap-2">
                        RACE ANALYZER <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500 text-white shadow">PRO</span>
                    </h1>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="openOcrModal()" class="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-xs text-white font-extrabold rounded-lg transition flex items-center gap-1.5 shadow-lg">
                    <i class="fa-solid fa-camera"></i><span class="hidden sm:inline">画像読取</span>
                </button>
            </div>
        </div>
    </header>
    <!-- Main Content Layout -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        <!-- Nav Tabs -->
        <div class="flex border-b border-byn-border space-x-2 overflow-x-auto">
            <button id="tab-dashboard-btn" onclick="switchTab('dashboard')" class="tab-btn px-5 py-3 text-sm font-bold border-b-2 border-blue-500 text-blue-400 flex items-center gap-2 transition whitespace-nowrap">
                <i class="fa-solid fa-chart-pie"></i> ダッシュボード
            </button>
            <button id="tab-input-btn" onclick="switchTab('input')" class="tab-btn px-5 py-3 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center gap-2 transition whitespace-nowrap">
                <i class="fa-solid fa-square-plus"></i> 個別入力
            </button>
            <button id="tab-records-btn" onclick="switchTab('records')" class="tab-btn px-5 py-3 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center gap-2 transition whitespace-nowrap">
                <i class="fa-solid fa-list-ul"></i> レース履歴 (<span id="record-count-badge">0</span>)
            </button>
        </div>

        <!-- TAB 1: DASHBOARD & PATTERN ANALYSIS -->
        <section id="tab-dashboard" class="space-y-6">
            <!-- Global Summary Cards -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
                <div class="bg-byn-card border border-byn-border rounded-xl p-4 shadow-md">
                    <span class="text-xs text-gray-400 block font-medium">総登録レース数</span>
                    <div class="flex items-baseline gap-1 mt-1">
                        <span id="stat-total-races" class="number-font text-3xl font-bold text-white">0</span><span class="text-xs text-gray-400">件</span>
                    </div>
                </div>
                <div class="bg-byn-card border border-byn-border rounded-xl p-4 shadow-md">
                    <span class="text-xs text-gray-400 block font-medium">総投資額</span>
                    <div class="flex items-baseline gap-1 mt-1">
                        <span id="stat-total-invest" class="number-font text-3xl font-bold text-gray-200">¥0</span>
                    </div>
                </div>
                <div class="bg-byn-card border border-byn-border rounded-xl p-4 shadow-md">
                    <span class="text-xs text-gray-400 block font-medium">総払戻金</span>
                    <div class="flex items-baseline gap-1 mt-1">
                        <span id="stat-total-payout" class="number-font text-3xl font-bold text-gray-200">¥0</span>
                    </div>
                </div>
                <div class="bg-byn-card border border-byn-border rounded-xl p-4 shadow-md">
                    <span class="text-xs text-gray-400 block font-medium">通算純損益</span>
                    <div class="flex items-baseline gap-1 mt-1">
                        <span id="stat-total-profit" class="number-font text-3xl font-bold text-white">¥0</span>
                    </div>
                </div>
                <div class="col-span-2 md:col-span-1 bg-gradient-to-br from-byn-card to-slate-900 border border-blue-500/30 rounded-xl p-4 shadow-lg">
                    <div class="flex justify-between items-center">
                        <span class="text-xs text-gray-400 font-medium">トータル回収率</span>
                        <span id="stat-total-hitrate" class="text-xs font-bold text-emerald-400">的中率 0%</span>
                    </div>
                    <div class="flex items-baseline gap-1 mt-1">
                        <span id="stat-total-return" class="number-font text-4xl font-black text-blue-400">0.0%</span>
                    </div>
                </div>
            </div>

            <!-- CORE PATTERN ANALYSIS -->
            <div class="space-y-4">
                <h2 class="text-lg font-extrabold text-white flex items-center gap-2">
                    <i class="fa-solid fa-cubes-stacked text-amber-400"></i> パターン別 成績比較
                </h2>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- B & Y & N (全重複) -->
                    <div class="bg-gradient-to-r from-amber-500/10 to-byn-card border-2 border-amber-500/80 rounded-2xl p-4 shadow-xl col-span-1 md:col-span-3 lg:col-span-1">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-extrabold text-white text-lg">B & Y & N <span class="text-xs font-normal text-amber-300 ml-1">(全重複)</span></h3>
                            <span id="pat-B_Y_N-count" class="text-xs text-gray-400 font-bold">0件</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <div class="bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-center">
                                <span class="text-[10px] text-gray-400 block">回収率</span>
                                <span id="pat-B_Y_N-return" class="number-font text-2xl font-black text-amber-400">0.0%</span>
                            </div>
                            <div class="bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-center">
                                <span class="text-[10px] text-gray-400 block">的中率</span>
                                <span id="pat-B_Y_N-hit" class="number-font text-2xl font-bold text-emerald-400">0.0%</span>
                            </div>
                        </div>
                        <div class="flex justify-between items-center text-xs text-gray-300 pt-1">
                            <span class="text-gray-400">純損益:</span><span id="pat-B_Y_N-profit" class="font-bold">¥0</span>
                        </div>
                    </div>
                    <!-- B & Y -->
                    <div class="bg-byn-card border border-blue-500/40 rounded-2xl p-4 shadow-xl">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-bold text-white text-base">B & Y</h3><span id="pat-B_Y-count" class="text-xs text-gray-400">0件</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <div class="bg-slate-900/80 p-2 rounded text-center"><span class="text-[10px] text-gray-400 block">回収率</span><span id="pat-B_Y-return" class="number-font text-xl text-blue-400">0.0%</span></div>
                            <div class="bg-slate-900/80 p-2 rounded text-center"><span class="text-[10px] text-gray-400 block">的中率</span><span id="pat-B_Y-hit" class="number-font text-xl text-emerald-400">0.0%</span></div>
                        </div>
                        <div class="flex justify-between text-xs pt-1"><span class="text-gray-400">純損益:</span><span id="pat-B_Y-profit">¥0</span></div>
                    </div>

                    <!-- Y & N -->
                    <div class="bg-byn-card border border-amber-500/40 rounded-2xl p-4 shadow-xl">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-bold text-white text-base">Y & N</h3><span id="pat-Y_N-count" class="text-xs text-gray-400">0件</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <div class="bg-slate-900/80 p-2 rounded text-center"><span class="text-[10px] text-gray-400 block">回収率</span><span id="pat-Y_N-return" class="number-font text-xl text-amber-400">0.0%</span></div>
                            <div class="bg-slate-900/80 p-2 rounded text-center"><span class="text-[10px] text-gray-400 block">的中率</span><span id="pat-Y_N-hit" class="number-font text-xl text-emerald-400">0.0%</span></div>
                        </div>
                        <div class="flex justify-between text-xs pt-1"><span class="text-gray-400">純損益:</span><span id="pat-Y_N-profit">¥0</span></div>
                    </div>

                    <!-- B & N -->
                    <div class="bg-byn-card border border-pink-500/40 rounded-2xl p-4 shadow-xl">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-bold text-white text-base">B & N</h3><span id="pat-B_N-count" class="text-xs text-gray-400">0件</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <div class="bg-slate-900/80 p-2 rounded text-center"><span class="text-[10px] text-gray-400 block">回収率</span><span id="pat-B_N-return" class="number-font text-xl text-pink-400">0.0%</span></div>
                            <div class="bg-slate-900/80 p-2 rounded text-center"><span class="text-[10px] text-gray-400 block">的中率</span><span id="pat-B_N-hit" class="number-font text-xl text-emerald-400">0.0%</span></div>
                        </div>
                        <div class="flex justify-between text-xs pt-1"><span class="text-gray-400">純損益:</span><span id="pat-B_N-profit">¥0</span></div>
                    </div>

                    <!-- 単独サイト (B, Y, N) -->
                    <div class="grid grid-cols-3 gap-2 col-span-1 md:col-span-3">
                        <div class="bg-byn-card border border-slate-700 rounded-xl p-2 text-center">
                            <div class="text-xs font-bold text-white mb-1">Bのみ <span id="pat-B-count" class="text-[10px] text-gray-500">0件</span></div>
                            <span id="pat-B-return" class="number-font text-lg text-blue-300 block">0.0%</span>
                            <span id="pat-B-profit" class="text-[10px] text-gray-400 block">¥0</span>
                        </div>
                        <div class="bg-byn-card border border-slate-700 rounded-xl p-2 text-center">
                            <div class="text-xs font-bold text-white mb-1">Yのみ <span id="pat-Y-count" class="text-[10px] text-gray-500">0件</span></div>
                            <span id="pat-Y-return" class="number-font text-lg text-amber-300 block">0.0%</span>
                            <span id="pat-Y-profit" class="text-[10px] text-gray-400 block">¥0</span>
                        </div>
                        <div class="bg-byn-card border border-slate-700 rounded-xl p-2 text-center">
                            <div class="text-xs font-bold text-white mb-1">Nのみ <span id="pat-N-count" class="text-[10px] text-gray-500">0件</span></div>
                            <span id="pat-N-return" class="number-font text-lg text-pink-300 block">0.0%</span>
                            <span id="pat-N-profit" class="text-[10px] text-gray-400 block">¥0</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- TAB 2: INPUT FORM & HANDWRITING -->
        <section id="tab-input" class="hidden space-y-6">
            <div class="bg-byn-card border border-byn-border rounded-xl p-5 shadow-lg relative">
                <form id="race-form" onsubmit="saveRace(event)" class="space-y-6">
                    <input type="hidden" id="edit-id" value="">

                    <!-- Step 1: Base Info -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="block text-xs font-bold text-gray-400">日付</label>
                            <input type="date" id="date" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                        </div>
                        <div class="space-y-1">
                            <label class="block text-xs font-bold text-gray-400">レース識別</label>
                            <input type="text" id="race-id" placeholder="例: 平塚11R" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                        </div>
                    </div>

                    <!-- Step 2: Site Checkboxes -->
                    <div class="space-y-2">
                        <div class="flex justify-between items-end">
                            <label class="block text-xs font-bold text-gray-400">推奨サイト (重複チェック)</label>
                            <span id="live-pattern-badge" class="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-gray-400 border border-slate-700">選択なし</span>
                        </div>
                        <div class="grid grid-cols-3 gap-3">
                            <label class="relative flex items-center justify-center p-3 rounded-xl border-2 border-slate-700 bg-slate-900 cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10">
                                <input type="checkbox" id="site-B" value="B" onchange="updateLivePattern()" class="peer hidden">
                                <span class="font-bold text-sm text-gray-400 peer-checked:text-white">Bサイト</span>
                            </label>
                            <label class="relative flex items-center justify-center p-3 rounded-xl border-2 border-slate-700 bg-slate-900 cursor-pointer has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/10">
                                <input type="checkbox" id="site-Y" value="Y" onchange="updateLivePattern()" class="peer hidden">
                                <span class="font-bold text-sm text-gray-400 peer-checked:text-white">Yサイト</span>
                            </label>
                            <label class="relative flex items-center justify-center p-3 rounded-xl border-2 border-slate-700 bg-slate-900 cursor-pointer has-[:checked]:border-pink-500 has-[:checked]:bg-pink-500/10">
                                <input type="checkbox" id="site-N" value="N" onchange="updateLivePattern()" class="peer hidden">
                                <span class="font-bold text-sm text-gray-400 peer-checked:text-white">Nサイト</span>
                            </label>
                        </div>
                    </div>
                    <hr class="border-byn-border">

                    <!-- Step 3: Multi-Ticket Input -->
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <label class="block text-xs font-bold text-gray-400">購入買い目リスト</label>
                            <button type="button" onclick="addTicketRow()" class="text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded transition hover:bg-blue-500/20">
                                <i class="fa-solid fa-plus"></i> 行を追加
                            </button>
                        </div>
                        <div id="tickets-container" class="space-y-2"></div>
                        <div class="flex justify-end pt-1">
                            <div class="text-sm font-bold text-gray-300">
                                合計投資額: <span id="live-total-invest" class="text-white text-lg number-font">¥0</span>
                            </div>
                        </div>
                    </div>

                    <hr class="border-byn-border">

                    <!-- Step 4: Handwriting Memo -->
                    <div class="space-y-2">
                        <div class="flex justify-between items-end mb-1">
                            <label class="block text-xs font-bold text-gray-400">展開・買い目メモ (手書き)</label>
                            <div class="flex items-center gap-2">
                                <div class="flex bg-slate-800 rounded-lg p-0.5">
                                    <button type="button" onclick="setCanvasColor('#38bdf8', this)" class="color-btn w-6 h-6 rounded-md bg-sky-400 ring-2 ring-white m-0.5"></button>
                                    <button type="button" onclick="setCanvasColor('#f43f5e', this)" class="color-btn w-6 h-6 rounded-md bg-rose-500 m-0.5"></button>
                                    <button type="button" onclick="setCanvasColor('#facc15', this)" class="color-btn w-6 h-6 rounded-md bg-yellow-400 m-0.5"></button>
                                </div>
                                <button type="button" onclick="clearCanvas()" class="text-xs text-gray-400 hover:text-rose-400 px-2 py-1 rounded bg-slate-800">クリア</button>
                            </div>
                        </div>
                        <div class="border-2 border-slate-700 rounded-xl overflow-hidden bg-slate-900 relative">
                            <canvas id="handwriting-canvas" class="w-full h-[200px] touch-none cursor-crosshair"></canvas>
                        </div>
                    </div>

                    <hr class="border-byn-border">

                    <!-- Step 5: Result & Payout -->
                    <div class="space-y-4 bg-slate-900 p-4 rounded-xl border border-slate-700/50">
                        <label class="block text-xs font-bold text-gray-400">レース結果 (事後入力)</label>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div class="space-y-1">
                                <label class="block text-[11px] text-gray-500">決定着順 (例: 5-1-6)</label>
                                <input type="text" id="result-combo" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-center font-bold focus:border-blue-500 focus:outline-none">
                            </div>
                            <div class="space-y-1">
                                <label class="block text-[11px] text-gray-500">2連単配当 (円)</label>
                                <div class="relative">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">¥</span>
                                    <input type="number" id="nirentan-amount" class="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-white text-right number-font font-bold focus:border-blue-500 focus:outline-none">
                                </div>
                            </div>
                            <div class="space-y-1">
                                <label class="block text-[11px] text-gray-500">3連単配当 (円)</label>
                                <div class="relative">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">¥</span>
                                    <input type="number" id="payout-amount" class="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-white text-right number-font font-bold focus:border-blue-500 focus:outline-none">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Submit -->
                    <div class="flex gap-3 pt-2">
                        <button type="submit" id="save-btn" class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition">
                            <span id="save-btn-text">このレースを保存する</span>
                        </button>
                        <button type="button" onclick="resetForm()" class="bg-slate-800 hover:bg-slate-700 text-gray-300 py-3.5 px-5 rounded-xl font-bold transition">
                            リセット
                        </button>
                    </div>
                </form>
            </div>
        </section>
        <!-- TAB 3: RECORDS LIST -->
        <section id="tab-records" class="hidden space-y-4">
            <div class="flex items-center justify-between bg-byn-card p-4 rounded-xl border border-byn-border shadow-md">
                <div class="text-sm font-bold text-gray-300 flex items-center gap-2">
                    <i class="fa-solid fa-filter text-blue-500"></i> 絞り込み
                </div>
                <select id="filter-pattern" onchange="renderRecords()" class="bg-slate-900 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                    <option value="ALL">全パターン表示</option>
                    <option value="B_Y_N">B & Y & N (全重複)</option>
                    <option value="B_Y">B & Y</option>
                    <option value="Y_N">Y & N</option>
                    <option value="B_N">B & N</option>
                    <option value="B">B 単独</option>
                    <option value="Y">Y 単独</option>
                    <option value="N">N 単独</option>
                </select>
            </div>
            <div id="records-container" class="space-y-3"></div>
        </section>
    </main>

    <!-- OCR Modal (2分割枠・直接保存対応版) -->
    <div id="ocr-modal" class="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
        <div class="bg-byn-card border border-byn-border rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl">
            <div class="flex justify-between items-center p-4 border-b border-slate-800">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <i class="fa-solid fa-camera text-emerald-400"></i> 一括画像読取 <span class="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-black">2枠合体直接保存</span>
                </h3>
                <button onclick="closeOcrModal()" class="text-gray-500 hover:text-white transition">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
            <div class="p-4 sm:p-6 overflow-y-auto space-y-4">
                <p class="text-xs text-gray-400 leading-relaxed">
                    上側の枠に<strong class="text-purple-400">「着順一覧」</strong>、下側の枠に<strong class="text-emerald-400">「配当一覧」</strong>のスクショをそれぞれ貼り付けてください。レース数が一致すると自動で結ばれ、ボタン一発で履歴に直接保存されます！
                </p>
                
                <!-- 2つの入力枠 Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- 1. 着順枠 -->
                    <div id="dropzone-order" class="dropzone-order border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[130px] relative" onclick="document.getElementById('file-order').click()">
                        <input type="file" id="file-order" accept="image/*" class="hidden" onchange="handleOcrFileSelection(event, 'order')">
                        <div id="status-order" class="space-y-2 pointer-events-none">
                            <i class="fa-solid fa-list-ol text-2xl text-purple-400"></i>
                            <div>
                                <p class="text-xs font-bold text-purple-200">1. 着順のスクショを貼る</p>
                                <p class="text-[10px] text-gray-500 mt-0.5" id="desc-order">未選択</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 2. 配当枠 -->
                    <div id="dropzone-payout" class="dropzone-payout border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[130px] relative" onclick="document.getElementById('file-payout').click()">
                        <input type="file" id="file-payout" accept="image/*" class="hidden" onchange="handleOcrFileSelection(event, 'payout')">
                        <div id="status-payout" class="space-y-2 pointer-events-none">
                            <i class="fa-solid fa-yen-sign text-2xl text-emerald-400"></i>
                            <div>
                                <p class="text-xs font-bold text-emerald-200">2. 配当のスクショを貼る</p>
                                <p class="text-[10px] text-gray-500 mt-0.5" id="desc-payout">未選択</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- プレビュー＆合体結果表示エリア -->
                <div class="bg-slate-900 border border-slate-700 rounded-xl p-3">
                    <div class="flex justify-between items-center mb-2 border-b border-slate-800 pb-2">
                        <h4 class="text-xs font-bold text-gray-400">合体プレビュー結果</h4>
                        <button type="button" onclick="clearOcrBoxes()" class="text-[10px] text-rose-400 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition border border-rose-500/30">
                            <i class="fa-solid fa-trash-can"></i> リセット
                        </button>
                    </div>
                    <div id="ocr-preview-container" class="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        <p class="text-xs text-gray-600 text-center py-4">両方の画像を読み込むと、ここに1R〜の結びついた結果が表示されます</p>
                    </div>
                </div>
            </div>
            <div class="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-b-2xl">
                <span id="ocr-match-status" class="text-xs text-gray-400 font-bold">状態: 画像待ち</span>
                <div class="flex gap-2">
                    <button type="button" onclick="closeOcrModal()" class="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg transition border border-slate-700">キャンセル</button>
                    <button type="button" id="ocr-save-btn" onclick="executeAppendMany()" disabled class="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition flex items-center gap-2 shadow-lg">
                        <i class="fa-solid fa-cloud-arrow-down"></i> この内容を履歴に直接追加する
                    </button>
                </div>
            </div>
        </div>
    </div>
        // --- 爆速OCRエンジン (2連単・3連単・白枠対応) ---
        const DIGIT_W = 12, DIGIT_H = 18;
        const DIGIT_BITS = {
            "0": "000011110000001111111100011100001110011000000110110000000011110000000011110000000011110000000011110000000011110000000011110000000011110000000011111000000011011000000110011100000110001111111100000111111000",
            "1": "000000000111000111111111111111111111111110001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111000000001111",
            "2": "000011100000011111111100011100011100011000001110110000000110110000000110000000001110000000001100000000011100000000011000000000110000000001100000000011000000000110000000011100000000011100000000111111111111111111111111",
            "3": "000011110000011111111100011100001110011000000110000000000110000000000110000000000110000011111100000011111000000011111100000000000110000000000110000000000011111000000110011000000110011100001110001111111100000011110000",
            "4": "000000011000000000111100000000111100000000111100000001001100000011001100000011001100000110001100001100001100011100001100011000001100011000001100111111111111111111111111000000001100000000001100000000001100000000001100",
            "5": "011111111110011111111110011000000000011000000000010000000000010000000000011111111000111100111100000000001110000000000110000000000111000000000011000000000011110000000110110000000110111000001110001111111100000111110000",
            "6": "000000111100000111111000001111000000001110000000011000000000011000000000010001111000111111111100111100001110111000000110110000000011110000000011110000000011111000000011011000000011011100000110001111111100000111111000",
            "7": "111111111111011111111111000000000110000000000110000000001110000000001100000000001100000000011000000000110000000000110000000000110000000001100000000011000000000110000000001100000000011000000000111000000000110000000",
            "8": "000011110000011110011100011100001100011000001110011000000110011000000110011100001100011100011100001111111100011110011100011100001110011000000110110000000011110000000011011000000110011100001110011111111100000011100000",
            "9": "000000000000001111111100011100011100011000000110110000000011110000000011110000000011110000000011011000000011011110011111001111111111000111110011000000000010000000000110000000011100000000111100001111111000000111000000"
        };
        function unpack(bits, w, h) {
            const grid = [];
            for (let y = 0; y < h; y++) grid.push(bits.slice(y * w, y * w + w).split("").map(c => (c === "1" ? 1 : 0)));
            return grid;
        }
        const DIGIT_TEMPLATES = Object.entries(DIGIT_BITS).map(([ch, bits]) => ({ ch, grid: unpack(bits, DIGIT_W, DIGIT_H) }));
        function at(img, x, y) { const i = (y * img.width + x) * 4; return [img.data[i] || 0, img.data[i + 1] || 0, img.data[i + 2] || 0]; }

        function rowBands(img) {
            const w = img.width, h = img.height, ys = [];
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
            const groups = [];
            for (const y of ys) {
                const last = groups[groups.length - 1];
                if (last && y - last[last.length - 1] <= Math.max(3, Math.floor(h / 600))) last.push(y);
                else groups.push([y]);
            }
            const lines = groups.filter(g => g[g.length - 1] - g[0] <= 8 && g[0] > h * 0.05).map(g => g[Math.floor(g.length / 2)]);
            const bands = [];
            for (let i = 0; i < lines.length - 1; i++) {
                const gap = lines[i + 1] - lines[i];
                if (gap > h * 0.02 && gap < h * 0.15) bands.push([lines[i] + 2, lines[i + 1] - 2]);
            }
            return bands;
        }

        function components(img, x0, x1, y0, y1, dark) {
            const w = x1 - x0, h = y1 - y0;
            if (w <= 0 || h <= 0) return [];
            const mask = new Uint8Array(w * h), seen = new Uint8Array(w * h);
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
                    const stack = [[x, y]]; seen[start] = 1;
                    const pts = [];
                    while (stack.length) {
                        const [cx, cy] = stack.pop(); pts.push([cx, cy]);
                        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                            const nx = cx + dx, ny = cy + dy;
                            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                            const ni = ny * w + nx;
                            if (mask[ni] && !seen[ni]) { seen[ni] = 1; stack.push([nx, ny]); }
                        }
                    }
                    let minX = pts[0][0], maxX = pts[0][0], minY = pts[0][1], maxY = pts[0][1];
                    for (const [px, py] of pts) {
                        if (px < minX) minX = px; if (px > maxX) maxX = px;
                        if (py < minY) minY = py; if (py > maxY) maxY = py;
                    }
                    comps.push({ x: minX + x0, y: minY + y0, x1: maxX + x0, y1: maxY + y0, n: pts.length, pts: pts.map(([px, py]) => [px + x0, py + y0]) });
                }
            }
            return comps;
        }

        function payoutGroups(img, y0, y1) {
            const w = img.width, rh = y1 - y0;
            const comps = components(img, Math.floor(w * 0.1), w - 2, y0 + Math.floor(rh * 0.1), y0 + Math.floor(rh * 0.9), 160).filter(c => c.n > 8 && c.y1 - c.y > rh * 0.1);
            if (!comps.length) return [];
            const heights = comps.map(c => c.y1 - c.y).sort((a, b) => a - b);
            const med = heights[Math.floor(heights.length / 2)];
            const kept = comps.filter(c => {
                const bw = c.x1 - c.x + 1, bh = c.y1 - c.y + 1;
                if (bh > med * 1.3 && bw < bh * 0.4) return false;
                if (bw > med * 1.5) return false;
                return true;
            }).sort((a, b) => a.x - b.x);
            const groups = [];
            for (const c of kept) {
                const last = groups[groups.length - 1];
                if (!last || c.x - last[last.length - 1].x1 > w * 0.05) groups.push([c]);
                else last.push(c);
            }
            return groups;
        }

        function groupValue(group) {
            if (!group.length || group.length > 7) return null;
            let text = "", dist = 0;
            for (const c of group) {
                const digit = readDigit(c);
                text += digit.ch; dist = Math.max(dist, digit.dist);
            }
            const value = Number(text);
            return Number.isFinite(value) ? { value, dist } : null;
        }

        function readDigit(c) {
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

        // 配当画像から「2連単」と「3連単」を取得
        function readPayout(img) {
            const rows = [];
            for (const [y0, y1] of rowBands(img)) {
                const groups = payoutGroups(img, y0, y1);
                if (groups.length < 1) continue;
                let vals = [];
                for(const g of groups) {
                    const val = groupValue(g);
                    if(val && val.dist <= 150 && val.value >= 100) vals.push(val.value);
                }
                if(vals.length >= 2) {
                    rows.push({ nirentan: vals[0], sanrentan: vals[vals.length - 1] });
                } else if(vals.length === 1) {
                    rows.push({ nirentan: 0, sanrentan: vals[0] });
                }
            }
            return rows;
        }

        function isBg(rgb) { return rgb[0] > 200 && rgb[1] > 200 && rgb[2] > 200; }

        function plateColor(rgb) {
            const [r, g, b] = rgb, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx - mn;
            if (mn > 170 && sat < 40) return 1; // 白枠対応
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

        function readCars(img, y0, y1) {
            const w = img.width, rh = y1 - y0, band0 = y0 + Math.floor(rh * 0.1), band1 = y0 + Math.floor(rh * 0.9);
            const col = new Array(w).fill(0);
            for (let x = 0; x < w; x++) {
                let c = 0;
                for (let y = band0; y < band1; y++) if (!isBg(at(img, x, y))) c++;
                col[x] = c;
            }
            const thresh = Math.floor((band1 - band0) * 0.3), runs = [];
            let x = 0;
            while (x < w) {
                if (col[x] >= thresh) {
                    const x0 = x; while (x < w && col[x] >= thresh) x++;
                    if (x - x0 >= 10 && x - x0 <= Math.floor(w * 0.15)) runs.push([x0, x - 1]);
                } else x++;
            }
            const cars = [];
            for (const [x0, x1] of runs) {
                const cx = (x0 + x1) / 2;
                if (cx <= w * 0.05 || cx >= w * 0.95) continue;
                const samples = [];
                const yy0 = band0 + Math.floor((band1 - band0) * 0.2), yy1 = band0 + Math.floor((band1 - band0) * 0.8);
                for (let yy = yy0; yy < yy1; yy++) {
                    for (const xx of [x0 + 2, x1 - 2]) {
                        if (xx >= 0 && xx < w) samples.push(at(img, xx, yy));
                    }
                }
                if (!samples.length) continue;
                const med = [0, 1, 2].map(k => {
                    const vals = samples.map(s => s[k]).sort((a, b) => a - b);
                    return vals[Math.floor(vals.length / 2)];
                });
                const car = plateColor(med);
                if (car) cars.push(car);
            }
            if (cars.length >= 3) return [cars[0], cars[1], cars[2]];
            return null;
        }

        function readOrder(img) {
            const rows = [];
            for (const [y0, y1] of rowBands(img)) {
                const cars = readCars(img, y0, y1);
                if (cars) rows.push({ cars });
            }
            return rows;
        }

        function ingestShot(img) {
            const order = readOrder(img);
            const payout = readPayout(img);
            let kind = "unknown";
            if (order.length >= 1 && order[0].cars) kind = "order";
            else if (payout.length >= 1 && payout[0].sanrentan) kind = "payout";
            return { kind, order, payout };
        }
        // --- 2分割枠のOCR状態管理変数 ---
        let currentOrderData = [];
        let currentPayoutData = [];

        document.addEventListener('DOMContentLoaded', () => {
            loadData(); initCanvas(); renderDashboard(); renderRecords(); updateRecordCountBadge();
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            addTicketRow();
        });

        function openOcrModal() { document.getElementById('ocr-modal').classList.remove('hidden'); }
        function closeOcrModal() { document.getElementById('ocr-modal').classList.add('hidden'); }

        // 個別ファイル選択（またはペースト）時の処理
        function handleOcrFileSelection(e, type) {
            const file = e.target.files[0];
            if (!file) return;

            const descEl = document.getElementById(`desc-${type}`);
            descEl.textContent = "解析中...";

            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const cvs = document.createElement('canvas');
                    cvs.width = img.width; cvs.height = img.height;
                    const c = cvs.getContext('2d'); c.drawImage(img, 0, 0);
                    const imgData = c.getImageData(0, 0, cvs.width, cvs.height);
                    const raster = { width: cvs.width, height: cvs.height, data: imgData.data };

                    const res = ingestShot(raster);

                    if (type === 'order') {
                        if (res.order && res.order.length > 0) {
                            currentOrderData = res.order;
                            descEl.textContent = `${res.order.length}レースの着順を取得`;
                            document.getElementById('dropzone-order').classList.add('border-purple-500', 'bg-purple-500/10');
                        } else {
                            descEl.textContent = "着順が読み取れませんでした";
                        }
                    } else if (type === 'payout') {
                        if (res.payout && res.payout.length > 0) {
                            currentPayoutData = res.payout;
                            descEl.textContent = `${res.payout.length}レースの配当を取得`;
                            document.getElementById('dropzone-payout').classList.add('border-emerald-500', 'bg-emerald-500/10');
                        } else {
                            descEl.textContent = "配当が読み取れませんでした";
                        }
                    }

                    checkOcrMatch();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }

        // 両方のデータが揃って行数が一致するかチェック
        function checkOcrMatch() {
            const previewContainer = document.getElementById('ocr-preview-container');
            const statusEl = document.getElementById('ocr-match-status');
            const saveBtn = document.getElementById('ocr-save-btn');

            if (currentOrderData.length > 0 && currentPayoutData.length > 0) {
                if (currentOrderData.length === currentPayoutData.length) {
                    statusEl.textContent = `状態: 準備完了 (${currentOrderData.length}レース一致)`;
                    statusEl.className = "text-xs text-emerald-400 font-bold";
                    saveBtn.removeAttribute('disabled');

                    previewContainer.innerHTML = '';
                    for (let i = 0; i < currentOrderData.length; i++) {
                        const o = currentOrderData[i];
                        const p = currentPayoutData[i];
                        const comboStr = o.cars ? o.cars.join('-') : "";
                        previewContainer.innerHTML += `
                            <div class="flex items-center justify-between p-2 bg-slate-800/80 rounded-lg text-xs">
                                <span class="font-bold text-yellow-400">${i + 1}R</span>
                                <span class="text-white font-mono">着順: ${comboStr}</span>
                                <span class="text-emerald-300 font-mono">2連: ¥${p.nirentan || 0} / 3連: ¥${p.sanrentan || 0}</span>
                            </div>`;
                    }
                } else {
                    statusEl.textContent = `状態: レース数が不一致 (着順:${currentOrderData.length} vs 配当:${currentPayoutData.length})`;
                    statusEl.className = "text-xs text-rose-400 font-bold";
                    saveBtn.setAttribute('disabled', 'true');
                    previewContainer.innerHTML = `<p class="text-xs text-rose-400 text-center py-2">着順と配当のレース数が一致しません</p>`;
                }
            } else {
                statusEl.textContent = "状態: 画像待ち";
                statusEl.className = "text-xs text-gray-400 font-bold";
            }
        }

        function clearOcrBoxes() {
            currentOrderData = [];
            currentPayoutData = [];
            document.getElementById('file-order').value = '';
            document.getElementById('file-payout').value = '';
            document.getElementById('desc-order').textContent = "未選択";
            document.getElementById('desc-payout').textContent = "未選択";
            document.getElementById('dropzone-order').classList.remove('border-purple-500', 'bg-purple-500/10');
            document.getElementById('dropzone-payout').classList.remove('border-emerald-500', 'bg-emerald-500/10');
            document.getElementById('ocr-preview-container').innerHTML = '<p class="text-xs text-gray-600 text-center py-4">両方の画像を読み込むと、ここに1R〜の結びついた結果が表示されます</p>';
            document.getElementById('ocr-save-btn').setAttribute('disabled', 'true');
            document.getElementById('ocr-match-status').textContent = "状態: 画像待ち";
        }

        // 【直接保存の実行】appendManyに渡してリストへ一括追加
        function executeAppendMany() {
            if (currentOrderData.length === 0 || currentOrderData.length !== currentPayoutData.length) return;

            const newRecords = [];
            const today = document.getElementById('date').value || new Date().toISOString().split('T')[0];

            for (let i = 0; i < currentOrderData.length; i++) {
                const o = currentOrderData[i];
                const p = currentPayoutData[i];
                const comboStr = o.cars ? o.cars.join('-') : "";

                newRecords.unshift({
                    id: 'RACE_' + Date.now() + '_' + i,
                    date: today,
                    raceIdStr: `${i + 1}R`,
                    sites: [],
                    patternKey: 'NONE',
                    tickets: [],
                    totalInvest: 0,
                    resultCombo: comboStr,
                    nirentanAmount: p.nirentan || 0,
                    payoutAmount: p.sanrentan || 0,
                    isHit: false,
                    totalReturn: 0,
                    drawingData: '',
                    timestamp: Date.now() + i
                });
            }

            // 直接履歴リストに結合して保存
            races = [...newRecords, ...races];
            saveData();
            closeOcrModal();
            clearOcrBoxes();
            switchTab('records');
            alert(`${newRecords.length}レース分の結果を履歴に直接追加しました！`);
        }

        // ---------------------------------------------------
        // アプリのデータ管理 ＆ その他基本機能
        // ---------------------------------------------------
        function loadData() { const d = localStorage.getItem('BYN_RACE_DATA_PRO'); if (d) races = JSON.parse(d); }
        function saveData() { localStorage.setItem('BYN_RACE_DATA_PRO', JSON.stringify(races)); updateRecordCountBadge(); renderDashboard(); renderRecords(); }

        let races = [];
        let canvas, ctx, isDrawing = false, currentBrushColor = '#38bdf8';

        function switchTab(tabId) {
            ['dashboard', 'input', 'records'].forEach(id => {
                document.getElementById('tab-' + id).classList.add('hidden');
                const btn = document.getElementById('tab-' + id + '-btn');
                btn.classList.remove('border-blue-500', 'text-blue-400');
                btn.classList.add('border-transparent', 'text-gray-400');
            });
            document.getElementById('tab-' + tabId).classList.remove('hidden');
            const actBtn = document.getElementById('tab-' + tabId + '-btn');
            actBtn.classList.remove('border-transparent', 'text-gray-400'); actBtn.classList.add('border-blue-500', 'text-blue-400');
            if (tabId === 'dashboard') renderDashboard(); if (tabId === 'records') renderRecords();
        }

        const PATTERNS = [
            { id: 'B_Y_N', label: 'B & Y & N', badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/50' },
            { id: 'B_Y', label: 'B & Y', badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
            { id: 'Y_N', label: 'Y & N', badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/50' },
            { id: 'B_N', label: 'B & N', badgeClass: 'bg-pink-500/20 text-pink-400 border-pink-500/50' },
            { id: 'B', label: 'B 単独', badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
            { id: 'Y', label: 'Y 単独', badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
            { id: 'N', label: 'N 単独', badgeClass: 'bg-pink-500/10 text-pink-300 border-pink-500/30' },
            { id: 'NONE', label: '未選択/OCR', badgeClass: 'bg-slate-700 text-gray-300 border-slate-600' }
        ];

        function getSelectedSites() {
            const s = [];
            if (document.getElementById('site-B').checked) s.push('B');
            if (document.getElementById('site-Y').checked) s.push('Y');
            if (document.getElementById('site-N').checked) s.push('N');
            return s;
        }

        function getPatternKey(sites) {
            if (sites.length === 3) return 'B_Y_N'; if (sites.length === 2) return sites.join('_'); if (sites.length === 1) return sites[0]; return 'NONE';
        }

        function updateLivePattern() {
            const sites = getSelectedSites(), badge = document.getElementById('live-pattern-badge');
            if (sites.length === 0) { badge.textContent = '選択なし'; badge.className = 'text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-gray-400 font-bold border border-slate-700'; return; }
            const p = PATTERNS.find(x => x.id === getPatternKey(sites));
            if (p) { badge.textContent = p.label; badge.className = `text-xs px-2.5 py-0.5 rounded-full font-bold border ${p.badgeClass}`; }
        }

        function addTicketRow(combo = '', amount = 100) {
            const container = document.getElementById('tickets-container'), rowId = 'ticket-' + Date.now();
            const div = document.createElement('div'); div.id = rowId; div.className = 'flex gap-2 items-center';
            div.innerHTML = `
                <div class="relative flex-1">
                    <input type="text" value="${combo}" placeholder="例: 1-2-3" class="ticket-combo w-full bg-slate-800 border-none rounded py-1.5 px-2 text-sm font-bold text-white focus:ring-1 focus:ring-blue-500 font-mono">
                </div>
                <div class="relative w-24">
                    <input type="number" min="100" step="100" value="${amount}" oninput="updateTotalInvest()" class="ticket-amount w-full bg-slate-800 border-none rounded py-1.5 px-2 text-sm font-bold text-white focus:ring-1 focus:ring-blue-500 number-font text-right">
                </div>
                <button type="button" onclick="removeTicketRow('${rowId}')" class="text-gray-500 hover:text-rose-500 px-2"><i class="fa-solid fa-xmark"></i></button>`;
            container.appendChild(div); updateTotalInvest();
        }

        function removeTicketRow(id) { const r = document.getElementById(id); if(r) r.remove(); updateTotalInvest(); if(document.querySelectorAll('.ticket-amount').length===0) addTicketRow(); }
        function updateTotalInvest() { let t = 0; document.querySelectorAll('.ticket-amount').forEach(i => { t += parseInt(i.value) || 0; }); document.getElementById('live-total-invest').textContent = `¥${t.toLocaleString()}`; }
        function getTicketsData() { const tkts = []; document.querySelectorAll('#tickets-container > div').forEach(r => { const c = r.querySelector('.ticket-combo').value.trim(), a = parseInt(r.querySelector('.ticket-amount').value) || 0; if (c || a > 0) tkts.push({ combo: c, amount: a }); }); return tkts; }

        function saveRace(e) {
            e.preventDefault();
            const sites = getSelectedSites();
            const tkts = getTicketsData(), totInv = tkts.reduce((s, t) => s + t.amount, 0);
            const resCombo = document.getElementById('result-combo').value.trim();
            const nirenAmt = parseInt(document.getElementById('nirentan-amount').value) || 0;
            const payAmt = parseInt(document.getElementById('payout-amount').value) || 0;
            let hit = false, totRet = 0;
            if (resCombo) { const ht = tkts.find(t => t.combo === resCombo); if (ht) { hit = true; totRet = (ht.amount / 100) * payAmt; } }
            const race = { id: document.getElementById('edit-id').value || 'RACE_'+Date.now(), date: document.getElementById('date').value, raceIdStr: document.getElementById('race-id').value, sites: sites, patternKey: getPatternKey(sites), tickets: tkts, totalInvest: totInv, resultCombo: resCombo, nirentanAmount: nirenAmt, payoutAmount: payAmt, isHit: hit, totalReturn: totRet, drawingData: canvas ? canvas.toDataURL() : '', timestamp: Date.now() };
            const idx = races.findIndex(r => r.id === race.id); if (idx >= 0) races[idx] = race; else races.unshift(race);
            saveData(); resetForm(); switchTab('records');
            alert(hit ? `🎯 的中！ ${totRet.toLocaleString()}円を記録しました` : '保存しました');
        }

        function resetForm() {
            document.getElementById('race-form').reset(); document.getElementById('edit-id').value = ''; document.getElementById('save-btn-text').textContent = 'このレースを保存する'; document.getElementById('date').value = new Date().toISOString().split('T')[0]; document.getElementById('tickets-container').innerHTML = ''; addTicketRow(); updateLivePattern(); clearCanvas();
        }

        function editRace(id) {
            const race = races.find(r => r.id === id); if (!race) return;
            resetForm();
            document.getElementById('edit-id').value = race.id; document.getElementById('date').value = race.date; document.getElementById('race-id').value = race.raceIdStr || '';
            ['B','Y','N'].forEach(s => document.getElementById(`site-${s}`).checked = race.sites.includes(s)); updateLivePattern();
            const tc = document.getElementById('tickets-container'); tc.innerHTML = '';
            if (race.tickets && race.tickets.length > 0) race.tickets.forEach(t => addTicketRow(t.combo, t.amount)); else addTicketRow();
            document.getElementById('result-combo').value = race.resultCombo || ''; 
            document.getElementById('nirentan-amount').value = race.nirentanAmount || '';
            document.getElementById('payout-amount').value = race.payoutAmount || '';
            if (race.drawingData && ctx) { const img = new Image(); img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0); }; img.src = race.drawingData; }
            document.getElementById('save-btn-text').textContent = '変更を更新する'; switchTab('input');
        }

        function deleteRace(id) { if (confirm("削除しますか？")) { races = races.filter(r => r.id !== id); saveData(); } }

        function initCanvas() {
            canvas = document.getElementById('handwriting-canvas'); ctx = canvas.getContext('2d');
            const rect = canvas.parentElement.getBoundingClientRect(); canvas.width = rect.width; canvas.height = rect.height;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round'; updateBrush();
            const start = (e) => { isDrawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
            const move = (e) => { if (!isDrawing) return; e.preventDefault(); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
            const stop = () => { isDrawing = false; ctx.closePath(); };
            canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', stop); canvas.addEventListener('mouseout', stop);
            canvas.addEventListener('touchstart', start, {passive: false}); canvas.addEventListener('touchmove', move, {passive: false}); canvas.addEventListener('touchend', stop);
            const firstColorBtn = document.querySelector('.color-btn');
            if(firstColorBtn) firstColorBtn.classList.add('ring-2', 'ring-white');
        }
        function getPos(e) { const r = canvas.getBoundingClientRect(), cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY; return { x: cx - r.left, y: cy - r.top }; }
        function setCanvasColor(color, btn) { currentBrushColor = color; updateBrush(); document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white')); if(btn) btn.classList.add('ring-2', 'ring-white'); }
        function updateBrush() { if(ctx) { ctx.strokeStyle = currentBrushColor; ctx.lineWidth = 4; } }
        function clearCanvas() { if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }

        function renderDashboard() {
            let tInv = 0, tRet = 0, tHit = 0, comp = 0; const pSt = {};
            PATTERNS.forEach(p => pSt[p.id] = { cnt: 0, comp: 0, hits: 0, inv: 0, ret: 0 });
            races.forEach(r => {
                const k = r.patternKey || 'NONE'; if(!pSt[k]) pSt[k] = { cnt: 0, comp: 0, hits: 0, inv: 0, ret: 0 };
                pSt[k].cnt++;
                if (r.resultCombo) { comp++; tInv += r.totalInvest; tRet += r.totalReturn; if(r.isHit) tHit++; pSt[k].comp++; pSt[k].inv += r.totalInvest; pSt[k].ret += r.totalReturn; if(r.isHit) pSt[k].hits++; }
            });
            document.getElementById('stat-total-races').textContent = races.length; document.getElementById('stat-total-invest').textContent = `¥${tInv.toLocaleString()}`; document.getElementById('stat-total-payout').textContent = `¥${tRet.toLocaleString()}`;
            const prof = tRet - tInv; document.getElementById('stat-total-profit').textContent = `${prof >= 0 ? '+' : ''}¥${prof.toLocaleString()}`;
            document.getElementById('stat-total-hitrate').textContent = `的中率 ${comp > 0 ? ((tHit/comp)*100).toFixed(1) : 0}%`;
            document.getElementById('stat-total-return').textContent = `${tInv > 0 ? ((tRet/tInv)*100).toFixed(1) : 0}%`;

            PATTERNS.forEach(p => {
                const s = pSt[p.id], elCnt = document.getElementById(`pat-${p.id}-count`);
                if(elCnt) {
                    elCnt.textContent = `${s.cnt}件`;
                    document.getElementById(`pat-${p.id}-return`).textContent = `${s.inv > 0 ? ((s.ret/s.inv)*100).toFixed(1) : 0}%`;
                    if(document.getElementById(`pat-${p.id}-hit`)) document.getElementById(`pat-${p.id}-hit`).textContent = `${s.comp > 0 ? ((s.hits/s.comp)*100).toFixed(1) : 0}%`;
                    const pf = s.ret - s.inv; document.getElementById(`pat-${p.id}-profit`).textContent = `${pf >= 0 ? '+' : ''}¥${pf.toLocaleString()}`;
                }
            });
        }

        function updateRecordCountBadge() { document.getElementById('record-count-badge').textContent = races.length; }

        function renderRecords() {
            const cont = document.getElementById('records-container'), f = document.getElementById('filter-pattern').value;
            const sorted = [...races].sort((a, b) => new Date(b.date) - new Date(a.date) || (b.timestamp || 0) - (a.timestamp || 0));
            const filtered = sorted.filter(r => f === 'ALL' || (r.patternKey || 'NONE') === f);
            cont.innerHTML = '';
            
