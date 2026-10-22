import streamlit as st
import streamlit.components.v1 as components
import json
import os

# ページ基本設定
st.set_page_config(
    page_title="BYN Race Analyzer Pro",
    page_icon="🚲",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# スマホ向けレイアウトの調整CSS
st.markdown("""
    <style>
        .stApp { background-color: #0b0f19; }
        header { visibility: hidden; }
        #MainMenu { visibility: hidden; }
        footer { visibility: hidden; }
        .block-container { padding: 1rem !important; max-width: 480px; }
    </style>
""", unsafe_allow_html=True)

# アプリ本体のHTML・JavaScript（1枠統合OCR対応）
html_code = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BYN Race Analyzer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'byn-dark': '#0b0f19',
                        'byn-card': '#131c31',
                        'byn-border': '#1e293b',
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-byn-dark min-h-screen text-white pb-20">
    <div class="max-w-md mx-auto p-4 space-y-4">
        <header class="flex justify-between items-center bg-byn-card border border-byn-border rounded-2xl p-4 shadow-xl">
            <div>
                <h1 class="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">BYN Race Analyzer</h1>
                <span class="text-[10px] text-gray-400 font-semibold">1枠統合OCRエディション</span>
            </div>
        </header>
"""
html_code += """
        <!-- メインコンテンツ -->
        <main class="space-y-4">
            <div class="bg-byn-card border border-byn-border rounded-2xl p-5 space-y-4 shadow-xl">
                <h2 class="text-sm font-bold text-white flex items-center gap-2">
                    <i class="fa-solid fa-camera text-purple-400"></i> 1枠統合 OCR画像読取
                </h2>
                <p class="text-xs text-gray-400">
                    出走表（着順）と配当が写っているスクショを1枚ここに貼り付けるか、タップして選択してください。自動で一括解析されます！
                </p>

                <!-- 1枠に統合されたドロップゾーン -->
                <div id="unified-dropzone" 
                     class="border-2 border-dashed border-purple-500/50 bg-purple-500/5 rounded-xl p-6 text-center cursor-pointer hover:bg-purple-500/10 transition"
                     onclick="document.getElementById('unified-file-input').click()"
                     ondragover="event.preventDefault()"
                     ondrop="handleUnifiedDrop(event)">
                    
                    <input type="file" id="unified-file-input" class="hidden" accept="image/*" onchange="handleUnifiedFileSelection(event)">
                    
                    <div class="space-y-2">
                        <i class="fa-solid fa-cloud-arrow-up text-2xl text-purple-400"></i>
                        <div class="text-xs font-bold text-white" id="unified-desc">スクショをここに貼る、またはタップして選択</div>
                        <span class="text-[10px] text-gray-500 block">PNG, JPG 画像対応</span>
                    </div>
                </div>

                <!-- プレビュー確認エリア -->
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div class="flex justify-between items-center text-xs">
                        <span id="unified-match-status" class="text-gray-400 font-bold">状態: 画像待ち</span>
                    </div>
                    <div id="unified-preview-container" class="space-y-1 max-h-40 overflow-y-auto">
                        <p class="text-xs text-gray-600 text-center py-2">画像を読み込むとここに結果が表示されます</p>
                    </div>
                </div>

                <button id="unified-save-btn" onclick="executeUnifiedAppend()" disabled 
                    class="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-gray-600 text-white font-bold rounded-xl text-xs transition shadow-lg">
                    履歴に直接保存する
                </button>
            </div>
        </main>
    </div>
"""
html_code += """
    <script>
        let unifiedOrderData = [];
        let unifiedPayoutData = [];

        function handleUnifiedFileSelection(e) {
            const file = e.target.files[0];
            if (!file) return;
            processUnifiedImage(file);
        }

        function handleUnifiedDrop(e) {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (!file) return;
            processUnifiedImage(file);
        }

        function processUnifiedImage(file) {
            const descEl = document.getElementById('unified-desc');
            const statusEl = document.getElementById('unified-match-status');
            const saveBtn = document.getElementById('unified-save-btn');
            const previewContainer = document.getElementById('unified-preview-container');

            descEl.textContent = "解析中...";

            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const cvs = document.createElement('canvas');
                    cvs.width = img.width; cvs.height = img.height;
                    const c = cvs.getContext('2d'); c.drawImage(img, 0, 0);
                    
                    // ダミーの解析モック（ここで実際のOCR処理と連携します）
                    unifiedOrderData = [{ cars: [1, 2, 3], techs: ["", "", ""] }];
                    unifiedPayoutData = [{ sanrentan: 1500, sanPop: 3, nirentan: 500, niPop: 1 }];

                    if (unifiedOrderData.length > 0) {
                        descEl.textContent = "読取成功しました！";
                        statusEl.textContent = "状態: 準備完了";
                        statusEl.className = "text-xs text-emerald-400 font-bold";
                        saveBtn.removeAttribute('disabled');

                        previewContainer.innerHTML = `
                            <div class="flex items-center justify-between p-2 bg-slate-800/80 rounded-lg text-xs">
                                <span class="font-bold text-yellow-400">1R</span>
                                <span class="text-white font-mono">着順: 1-2-3</span>
                                <span class="text-emerald-300 font-mono">3連: ¥1500</span>
                            </div>`;
                    } else {
                        descEl.textContent = "データを読み取れませんでした";
                        statusEl.textContent = "状態: エラー";
                        statusEl.className = "text-xs text-rose-400 font-bold";
                    }
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }

        function executeUnifiedAppend() {
            alert("データを保存処理に渡しました！");
        }
    </script>
</body>
</html>
"""

# Streamlit上にHTMLを表示
components.html(html_code, height=750, scrolling=True)
