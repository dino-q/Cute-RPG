# Cute RPG Action Shooter

## Project Structure
```
├── index.html          ← HTML (精簡，~260行，無 inline onclick — 全用 data-action)
├── style.css           ← 全部 CSS 樣式
├── src/
│   ├── main.js         ← 進入點 + 膠水碼 (~350行)
│   ├── state.js        ← 共享狀態容器 S 物件（dragon 精靈圖）
│   ├── config.js       ← 常數、角色、模式、敵人角色定義
│   ├── cards.js        ← 52 張卡片定義 + rndBuff
│   ├── utils.js        ← 工具函式 (di, cl, rn, $)
│   ├── audio.js        ← BGM + SFX Web Audio 合成音效
│   ├── render.js       ← 繪圖函式（玩家、敵人、粒子、特效）
│   ├── hud.js          ← HUD、小地圖、提示
│   ├── input.js        ← 搖桿、鍵盤控制
│   ├── enemies.js      ← 敵人生成、波次系統、成長曲線
│   ├── combat.js       ← 射擊、揮劍、碰撞、擊殺結算
│   ├── skills.js       ← 角色技能、大招、閃避
│   ├── cards-ui.js     ← 卡片選擇 UI、天使卡、大寶箱
│   ├── boss.js         ← Stage Boss 系統（Lv20/Lv30）
│   ├── coop.js         ← PeerJS 連線、狀態同步
│   ├── practice.js     ← 練習模式
│   ├── ui.js           ← 選單、設定、結果畫面、cutscene
│   └── loop.js         ← 主遊戲迴圈 (~2400行)
├── assets/             ← 媒體 (mp4, mp3)，Vite publicDir
├── scripts/
│   └── verify.cjs      ← 驗證腳本 (build + Puppeteer 瀏覽器測試)
├── backups/            ← 備份版本（不進版控）
├── ARCHITECTURE.md     ← 模組架構文件
├── package.json
├── vite.config.js
└── .gitignore
```

## Development
```bash
npm run dev      # Vite dev server (HMR)
npm run build    # Production build → dist/
npm run verify   # 完整驗證 (build + 選擇性 Puppeteer)
```

## Architecture
- **Vite + ESM** — 原生模組系統，PeerJS 透過 npm 安裝
- **config.js** — 純常數 export（角色/模式/卡片稀有度等）
- **cards.js** — 52 張卡片定義，匯出 C 陣列和 rndBuff
- **audio.js** — 獨立音效模組，管理 BGM 和 SFX 合成
- **enemies.js** — 敵人生成、波次系統、成長曲線
- **combat.js** — 射擊、揮劍、碰撞、擊殺結算
- **skills.js** — 角色技能、大招、閃避
- **cards-ui.js** — 卡片選擇 UI、天使卡、大寶箱
- **boss.js** — Stage Boss 系統（Lv20/Lv30）
- **coop.js** — PeerJS 連線、狀態同步
- **practice.js** — 練習模式
- **ui.js** — 選單、設定、結果畫面、cutscene
- **main.js** — 遊戲核心邏輯，包含遊戲迴圈
  - 高度耦合的遊戲邏輯保持在同一檔案以避免循環依賴
  - 用 `═══` 區段註釋標記各功能區塊
- **state.js** — S 物件已定義，為未來進一步模組化預留

## ⚠️ 修改前必讀
- 要改任何功能前，先查 **ARCHITECTURE.md** 的「常見修改指南」，裡面列出每種修改要去哪個檔案的哪個函式
- ARCHITECTURE.md 還包含：模組依賴圖、函式索引、共享狀態文件、遊戲流程圖

## ⚠️ 修改後必做
- 如果**新增、刪除、或搬移了 export 函式**，更新 ARCHITECTURE.md 的「函式索引」
- 如果**新增了模組**，更新 ARCHITECTURE.md 的「模組總覽表」和「模組依賴圖」
- 如果**改了角色數值、卡片、推薦清單、敵人參數等遊戲設定**，更新 ARCHITECTURE.md 的「常見修改指南」中的對應說明
- 如果修改範圍小（bug fix、數值微調），不需要更新 ARCHITECTURE.md

## Rules
- 每次改動後 `npm run build` 確認無 build 錯誤
- 遊戲有 4 個模式：classic, elite, coop, practice — 全部必須正常運作
- HTML inline onclick 對應 window.xxx 函式 — 修改時需同步更新
- 媒體檔在 assets/ 目錄，Vite 自動複製到 dist/

## ✅ 重構完成（全部階段 0→5 完成）

- main.js: 6500 行 → 352 行
- 共 17 個模組（含 loop.js 2400 行的完整遊戲迴圈）
- index.html: 全部 onclick 改為 data-action 事件委派
- window.xxx 已清理，只剩 overGoHome/SG 供動態 HTML 使用
- ARCHITECTURE.md 已產出
