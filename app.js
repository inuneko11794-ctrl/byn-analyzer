import streamlit as st
import streamlit.components.v1 as components

# スマホでも見やすくするため画面を広く使う設定
st.set_page_config(page_title="BYN Race Analyzer", layout="wide", initial_sidebar_state="collapsed")

# ---------------------------------------------------------
# 新・爆速OCR ＆ 2画面合体対応版 HTMLコード
# ---------------------------------------------------------
html_code = r"""
<!DOCTYPE html>
<html lang="ja" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BYN Race Analyzer - 手書き編集強化＆予想重複分析</title>

    <!-- PWA & Mobile Web App Meta Tags -->
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="BYN Race">
    <meta name="theme-color" content="#080c14">

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- FontAwesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Teko:wght@600;700&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">

    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        byn: {
                            dark: '#080c14',
                            card: '#111827',
                            border: '#1f293d',
                            accent: '#2563eb',
                        }
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
        body {
            font-family: 'Noto Sans JP', sans-serif;
            background-color: #080c14;
            color: #f3f4f6;
        }
        .number-font {
            font-family: 'Teko', sans-serif;
            letter-spacing: 0.05em;
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #080c14; }
        ::-webkit-scrollbar-thumb { background: #1f293d; border-radius: 4px; }
        canvas { touch-action: none; }
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
                        RACE ANALYZER <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow">PRO EDIT</span>
                    </h1>
                </div>
            </div>

            <!-- Header Action Controls -->
            <div class="flex items-center gap-2">
                <button onclick="openOcrModal()" class="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-xs text-white font-extrabold rounded-lg transition flex items-center gap-1.5 shadow-lg">
                    <i class="fa-solid fa-bolt text-yellow-300"></i><span class="hidden sm:inline">画像読取</span>
                </button>
                <button onclick="exportCSV()" class="px-2.5 py-1.5 bg-slate-800 text-xs text-emerald-400 font-semibold rounded-lg transition shadow">
                    <i class="fa-solid fa-file-csv"></i><span class="hidden sm:inline">CSV</span>
                </button>
            </div>
        </div>
    </header>
    <!-- Main Content Layout -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        <!-- Nav Tabs -->
        <div class="flex border-b border-byn-border space-x-2 overflow-x-auto">
            <button id="tab-dashboard-btn" onclick="switchTab('dashboard')" class="tab-btn px-5 py-3 text-sm font-bold border-b-2 border-blue-500 text-blue-400 flex items-center gap-2 transition whitespace-nowrap">
                <i class="fa-solid fa-chart-pie"></i> ダッシュボード・全7パターン検証
            </button>
            <button id="tab-input-btn" onclick="switchTab('input')" class="tab-btn px-5 py-3 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center gap-2 transition whitespace-nowrap">
                <i class="fa-solid fa-square-plus"></i> レース＆買い目登録
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
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="block text-[11px] text-gray-500">決定着順 (例: 5-1-6)</label>
                                <input type="text" id="result-combo" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-center font-bold focus:border-blue-500 focus:outline-none">
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

    <!-- OCR Modal (2画面合体対応版) -->
    <div id="ocr-modal" class="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
        <div class="bg-byn-card border border-byn-border rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl">
            <div class="flex justify-between items-center p-4 border-b border-slate-800">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <i class="fa-solid fa-bolt text-yellow-400"></i> 画像読取 <span class="text-[10px] bg-yellow-600 text-slate-900 px-2 py-0.5 rounded font-black">2画面合体</span>
                </h3>
                <button onclick="closeOcrModal()" class="text-gray-500 hover:text-white transition">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
            <div class="p-4 sm:p-6 overflow-y-auto space-y-4">
                <p class="text-xs text-gray-400 leading-relaxed">
                    「着順の一覧」と「配当の一覧」のスクショを<strong class="text-yellow-400">連続で2回ペースト（または選択）</strong>してください。結果がどんどん下に追加・合体されます！
                </p>
                
                <!-- 単一のドロップ・ペースト領域 -->
                <div id="ocr-box-auto" class="border-2 border-dashed border-yellow-500/50 hover:border-yellow-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition bg-yellow-500/5 min-h-[120px] relative" onclick="document.getElementById('ocr-input-auto').click()">
                    <input type="file" id="ocr-input-auto" accept="image/*" class="hidden" onchange="handleOcrImage(event)">
                    <div id="ocr-idle-auto" class="space-y-2 pointer-events-none">
                        <i class="fa-solid fa-images text-3xl text-yellow-400/80"></i>
                        <div>
                            <p class="text-sm font-bold text-yellow-200">ここをタップ または コピペ</p>
                            <p class="text-[10px] text-gray-500 mt-1">何度でも追加で読み込めます</p>
                        </div>
                    </div>
                </div>
                
                <!-- 結果表示エリア -->
                <div class="bg-slate-900 border border-slate-700 rounded-xl p-3">
                    <div class="flex justify-between items-center mb-2 border-b border-slate-800 pb-2">
                        <h4 class="text-xs font-bold text-gray-400">抽出結果一覧</h4>
                        <button type="button" onclick="clearOcrBox()" class="text-[10px] text-rose-400 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition border border-rose-500/30">
                            <i class="fa-solid fa-trash-can"></i> リセット
                        </button>
                    </div>
                    <!-- ここに読み取った結果が「1R」「2R」のようにどんどん追加されていきます -->
                    <div id="ocr-results-container" class="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        <p id="ocr-empty-msg" class="text-xs text-gray-600 text-center py-4">画像を読み込むと、ここに結果が追加されていきます</p>
                    </div>
                </div>
            </div>
            <div class="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/50 rounded-b-2xl">
                <button type="button" onclick="closeOcrModal()" class="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg transition border border-slate-700">キャンセル</button>
                <button type="button" id="ocr-apply-btn" onclick="applyOcrToForm()" disabled class="px-5 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 text-sm font-bold rounded-lg transition flex items-center gap-2 shadow-lg">
                    <i class="fa-solid fa-check"></i> この結果をフォームへ適用
                </button>
            </div>
        </div>
    </div>
        // 【緩和済み】配当金額のグループ化と読み取り
        function payoutGroups(img, y0, y1) {
            const w = img.width, rh = y1 - y0;
            // 探す範囲を広げる
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

        function readPayout(img) {
            const rows = [];
            for (const [y0, y1] of rowBands(img)) {
                const groups = payoutGroups(img, y0, y1);
                if (groups.length < 1) continue;
                
                // 一覧画面の配当の中で、一番金額が大きいものを「3連単」とみなす
                let maxVal = 0;
                for(const g of groups) {
                    const val = groupValue(g);
                    // 判定距離の許容範囲を 150 まで緩和
                    if(val && val.dist <= 150 && val.value > maxVal && val.value >= 100) maxVal = val.value;
                }
                if(maxVal >= 100) rows.push({ sanrentan: maxVal });
            }
            return rows;
        }

        // 【緩和】白背景の判定（248 -> 200 に緩和）
        function isBg(rgb) { return rgb[0] > 200 && rgb[1] > 200 && rgb[2] > 200; }

        function plateColor(rgb) {
            const [r, g, b] = rgb, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx - mn;
            if (mn > 170 && sat < 40) return 1; // 白(緩和)
            if (mx < 120 && sat < 40) return 2; // 黒
            if (r > 190 && g > 130 && b < 150 && g > b + 30) return 5; // 黄(緩和)
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
                // 一覧画面用に位置の制約を緩和
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
            // 3車以上見つかれば着順とみなす
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
            // 1行でも見つかれば採用する
            if (order.length >= 1 && order.length >= payout.length) kind = "order";
            else if (payout.length >= 1) kind = "payout";
            return { kind, order, payout };
        }
        // --- 文字認識（形から数字を判別する処理） ---
        function readDigit(c) {
            let bestCh = "?", bestDist = 1e9;
            const pts = c.pts;
            let cx = 0, cy = 0;
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

        // ---------------------------------------------------
        // 2画面合体対応 UI連携処理
        // ---------------------------------------------------
        // 12レース分の空データを用意
        let ocrMergedData = Array.from({length: 12}, () => ({combo: "", payout: ""}));

        document.addEventListener('DOMContentLoaded', () => {
            loadData(); initCanvas(); renderDashboard(); renderRecords(); updateRecordCountBadge();
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            addTicketRow();
            window.addEventListener('paste', handleGlobalPaste);
        });

        function openOcrModal() { document.getElementById('ocr-modal').classList.remove('hidden'); }
        function closeOcrModal() { document.getElementById('ocr-modal').classList.add('hidden'); }
        
        function handleGlobalPaste(e) {
            if (!document.getElementById('ocr-modal').classList.contains('hidden')) {
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (let item of items) {
                    if (item.type.indexOf('image') !== -1) { handleOcrFile(item.getAsFile()); break; }
                }
            }
        }
        function handleOcrImage(e) { if (e.target.files && e.target.files.length > 0) handleOcrFile(e.target.files[0]); }

        function handleOcrFile(file) {
            const idle = document.getElementById('ocr-idle-auto');
            document.getElementById('ocr-results-container').innerHTML = '<p class="text-xs text-amber-500 font-bold text-center py-4"><i class="fa-solid fa-spinner fa-spin"></i> 画像を解析中...</p>';
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const cvs = document.createElement('canvas');
                    cvs.width = img.width; cvs.height = img.height;
                    const c = cvs.getContext('2d'); c.drawImage(img, 0, 0);
                    const imgData = c.getImageData(0, 0, cvs.width, cvs.height);
                    const raster = { width: cvs.width, height: cvs.height, data: imgData.data };
                    
                    // 爆速アルゴリズムを実行
                    const res = ingestShot(raster);
                    
                    // 【2画面合体処理】見つかったデータを、行ごとに保存
                    if (res.kind === "order") {
                        res.order.forEach((r, i) => { if(i < 12 && r.cars) ocrMergedData[i].combo = r.cars.join('-'); });
                    } else if (res.kind === "payout") {
                        res.payout.forEach((r, i) => { if(i < 12 && r.sanrentan) ocrMergedData[i].payout = r.sanrentan; });
                    }
                    
                    renderOcrResults();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function clearOcrBox() {
            ocrMergedData = Array.from({length: 12}, () => ({combo: "", payout: ""}));
            document.getElementById('ocr-input-auto').value = ''; 
            document.getElementById('ocr-results-container').innerHTML = '<p class="text-xs text-gray-600 text-center py-4">画像を読み込むと、ここに結果が追加されていきます</p>';
        }

        function renderOcrResults() {
            const container = document.getElementById('ocr-results-container');
            container.innerHTML = '';
            let hasData = false;
            
            ocrMergedData.forEach((data, i) => {
                if (data.combo || data.payout) {
                    hasData = true;
                    container.innerHTML += `
                    <div class="flex items-center gap-2 p-2 bg-slate-900 border border-slate-700 rounded-lg mb-2">
                        <span class="w-10 text-center font-bold text-white text-[10px] bg-slate-800 py-1 rounded">${i+1}R</span>
                        <div class="flex-1 flex gap-2">
                            <input type="text" id="ocr-merge-c-${i}" value="${data.combo}" class="w-full bg-slate-800 border-none rounded py-1 px-2 text-xs text-white font-mono focus:ring-1" placeholder="着順">
                            <input type="number" id="ocr-merge-p-${i}" value="${data.payout}" class="w-full bg-slate-800 border-none rounded py-1 px-2 text-xs text-white font-mono text-right focus:ring-1" placeholder="配当">
                        </div>
                        <button onclick="applyMergeRow(${i})" class="px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-900 text-[10px] font-bold rounded shadow">適用</button>
                    </div>`;
                }
            });
            if (!hasData) container.innerHTML = '<p class="text-xs text-rose-500 font-bold text-center py-4">読み取れるデータが見つかりませんでした</p>';
        }

        function applyMergeRow(i) {
            const c = document.getElementById(`ocr-merge-c-${i}`).value;
            const p = document.getElementById(`ocr-merge-p-${i}`).value;
            if(c) document.getElementById('result-combo').value = c;
            if(p) document.getElementById('payout-amount').value = p;
            closeOcrModal();
        }

        // ---------------------------------------------------
        // アプリのデータ管理 ＆ その他UI機能
        // ---------------------------------------------------
        function loadData() { const d = localStorage.getItem(STORAGE_KEY); if (d) races = JSON.parse(d); }
        function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(races)); updateRecordCountBadge(); renderDashboard(); }
        
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
            { id: 'N', label: 'N 単独', badgeClass: 'bg-pink-500/10 text-pink-300 border-pink-500/30' }
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
            const sites = getSelectedSites(); if (sites.length === 0) return alert("推奨サイトを選択してください。");
            const tkts = getTicketsData(), totInv = tkts.reduce((s, t) => s + t.amount, 0);
            const resCombo = document.getElementById('result-combo').value.trim(), payAmt = parseInt(document.getElementById('payout-amount').value) || 0;
            let hit = false, totRet = 0;
            if (resCombo) { const ht = tkts.find(t => t.combo === resCombo); if (ht) { hit = true; totRet = (ht.amount / 100) * payAmt; } }
            const race = { id: document.getElementById('edit-id').value || 'RACE_'+Date.now(), date: document.getElementById('date').value, raceIdStr: document.getElementById('race-id').value, sites: sites, patternKey: getPatternKey(sites), tickets: tkts, totalInvest: totInv, resultCombo: resCombo, payoutAmount: payAmt, isHit: hit, totalReturn: totRet, drawingData: canvas ? canvas.toDataURL() : '', timestamp: Date.now() };
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
            document.getElementById('result-combo').value = race.resultCombo || ''; document.getElementById('payout-amount').value = race.payoutAmount || '';
            if (race.drawingData && ctx) { const img = new Image(); img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0); }; img.src = race.drawingData; }
            document.getElementById('save-btn-text').textContent = '変更を更新する'; switchTab('input');
        }

        function deleteRace(id) { if (confirm("削除しますか？")) { races = races.filter(r => r.id !== id); saveData(); renderRecords(); } }

        function initCanvas() {
            canvas = document.getElementById('handwriting-canvas'); ctx = canvas.getContext('2d');
            const rect = canvas.parentElement.getBoundingClientRect(); canvas.width = rect.width; canvas.height = rect.height;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round'; updateBrush();
            const start = (e) => { isDrawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
            const move = (e) => { if (!isDrawing) return; e.preventDefault(); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
            const stop = () => { isDrawing = false; ctx.closePath(); };
            canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', stop); canvas.addEventListener('mouseout', stop);
            canvas.addEventListener('touchstart', start, {passive: false}); canvas.addEventListener('touchmove', move, {passive: false}); canvas.addEventListener('touchend', stop);
            document.querySelector('.color-btn').classList.add('ring-2', 'ring-white');
        }
        function getPos(e) { const r = canvas.getBoundingClientRect(), cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY; return { x: cx - r.left, y: cy - r.top }; }
        function setCanvasColor(color, btn) { currentBrushColor = color; updateBrush(); document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white')); if(btn) btn.classList.add('ring-2', 'ring-white'); }
        function updateBrush() { if(ctx) { ctx.strokeStyle = currentBrushColor; ctx.lineWidth = 4; } }
        function clearCanvas() { if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }

        function renderDashboard() {
            let tInv = 0, tRet = 0, tHit = 0, comp = 0; const pSt = {};
            PATTERNS.forEach(p => pSt[p.id] = { cnt: 0, comp: 0, hits: 0, inv: 0, ret: 0 });
            races.forEach(r => {
                const k = r.patternKey; if(!pSt[k]) return;
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
            const filtered = sorted.filter(r => f === 'ALL' || r.patternKey === f);
            cont.innerHTML = '';
            if (filtered.length === 0) { cont.innerHTML = `<div class="text-center py-6 text-gray-500">データがありません</div>`; return; }
            filtered.forEach(r => {
                const pat = PATTERNS.find(p => p.id === r.patternKey) || { label: '不明', badgeClass: 'bg-slate-700' };
                const net = r.totalReturn - r.totalInvest;
                cont.innerHTML += `
                    <div class="bg-byn-card border border-byn-border rounded-xl p-3 flex flex-col sm:flex-row gap-4 relative">
                        ${r.isHit ? '<div class="absolute top-0 right-0 w-8 h-8 bg-emerald-500/20 transform rotate-45 translate-x-4 -translate-y-4"></div>' : ''}
                        <div class="flex-1 flex flex-col justify-between">
                            <div class="flex justify-between items-start mb-2">
                                <div><span class="text-[10px] px-2 py-0.5 rounded border font-bold ${pat.badgeClass} mr-2">${pat.label}</span><span class="text-xs text-gray-400">${r.date}</span>
                                <h4 class="font-bold text-white text-sm mt-1">${r.raceIdStr || '未設定レース'}</h4></div>
                                <div class="flex items-center gap-1">
                                    <button onclick="editRace('${r.id}')" class="w-7 h-7 rounded bg-slate-800 text-blue-400"><i class="fa-solid fa-pen text-[10px]"></i></button>
                                    <button onclick="deleteRace('${r.
