# Cute RPG Action Shooter — 重構計畫

## Context
原始：單一 `index.html` 415KB / 7168 行（HTML+CSS+JS 混合）。
目標：拆分成 PLAN 中列出的所有模組，功能必須與原版完全一致。

## ⚠️ 絕對規則（違反即失敗）

### 不准擅自結案
- **必須完成 PLAN 中所有階段（0→1→2→3→4→5）才算結案**
- **階段 3 有 14 個子模組，必須全部抽出，不得跳過任何一個**
- **不得因為「太複雜」「高度耦合」「避免循環依賴」等理由放棄拆分**
- **如果遇到困難，必須解決問題，不是放棄任務**
- **main.js 最終行數目標 ≤ 500 行（只剩進入點 + 膠水碼）**

### Commit 規則
1. **每完成一個子模組就 git commit**（不要攢多個一起提交）
2. **每次 commit 前 `npm run build` 必須通過**
3. **如果 build 失敗，必須修復後重新 commit**，不能跳過
4. **所有 4 個模式（classic, elite, coop, practice）的功能必須與原版完全一致**

### 驗證
- 驗證腳本 `scripts/verify.cjs`（CommonJS）
- 環境：Windows（本機開發），或 Docker (node:20) + chromium
- Puppeteer 參數：`--no-sandbox --disable-gpu --disable-dev-shm-usage`

### 執行方式
- **按照階段 3 的順序，從第一個未完成的模組開始，逐一抽出**
- **每完成一個模組就 commit，然後立刻繼續下一個**
- **不要停下來問使用者，不要跳過任何一個**
- **如果 context 太長導致中斷，下次對話時讀 PLAN.md，看 src/ 裡已有哪些模組，從第一個 ⬜ 繼續**
- **不要暫停，持續完成到整個專案結束（階段 0→5 全部完成）**
- **只在 context 已滿時才中斷，下次對話繼續**

### 循環依賴處理策略
當模組 A 和模組 B 互相依賴時，用以下方法解決（按優先順序）：
1. **提取共用部分到第三個模組**（如 utils 或 shared）
2. **用函式注入**（模組 A export 一個 register 函式，讓 main.js 在 init 時注入 B 的函式）
3. **用事件/回調**（模組 A emit 事件，模組 B 監聽）
4. **延遲 import**（在函式內部 dynamic import，而非頂層）
- ❌ 絕對不可以「因為有循環依賴所以不拆」

## 技術方案：Vite + ESM 模組

### 為什麼用 Vite
- 零配置、開發時原生 ESM + HMR
- `vite build` 打包成可部署的靜態檔案
- 可以 `npm install peerjs` 取代 CDN script

### 驗證 Hook 設計
建立 `scripts/verify.js`（Node.js 腳本）作為 pre-commit hook：
1. 用 Vite 做 production build (`vite build`)
2. 啟動靜態伺服器 serve `dist/`
3. 用 Puppeteer 開啟遊戲頁面
4. 檢查：Canvas 存在、無 JS 錯誤、遊戲主要函式可呼叫、能進入遊戲畫面
5. 全部通過才允許 commit

### Hook 安裝方式
- `package.json` 的 `scripts.verify` 指向驗證腳本
- `.claude/settings.json` 設定 pre-commit hook 呼叫 `npm run verify`

---

## 目錄結構

```
Cute-RPG-ActionShooter/
├── index.html              ← 精簡 HTML（~80 行）
├── style.css               ← 抽出的 CSS
├── src/
│   ├── main.js             ← 進入點
│   ├── state.js            ← 共享狀態容器（S 物件）
│   ├── config.js           ← 常數、角色、模式定義
│   ├── cards.js            ← 51 張卡片定義 + 工具函式
│   ├── audio.js            ← BGM、SFX、Boss 音樂
│   ├── input.js            ← 搖桿、鍵盤控制
│   ├── render.js           ← 繪圖函式（玩家、敵人、粒子、特效）
│   ├── hud.js              ← HUD、小地圖、提示
│   ├── loop.js             ← 主遊戲迴圈（最大檔案 ~2400 行）
│   ├── combat.js           ← 射擊、揮劍、碰撞、擊殺結算
│   ├── skills.js           ← 角色技能、大招、閃避
│   ├── enemies.js          ← 敵人生成、波次、成長曲線
│   ├── cards-ui.js         ← 卡片選擇 UI、天使卡、大寶箱
│   ├── boss.js             ← Stage Boss 系統
│   ├── coop.js             ← PeerJS 連線、狀態同步
│   ├── practice.js         ← 練習模式
│   ├── ui.js               ← 選單、設定、結果畫面、cutscene
│   └── utils.js            ← 工具函式（di, cl, rn, $, etc.）
├── assets/
│   ├── END_clip_clean.mp4
│   └── One_More_Credit.mp3
├── scripts/
│   └── verify.js           ← 自動驗證腳本
├── backups/                ← 備份檔（不進版控）
├── package.json
├── vite.config.js
├── .gitignore
└── CLAUDE.md
```

---

## 遷移步驟（漸進式，每步驗證）

### 階段 0：基礎建設 ✅ `6bd7d01`
1. ✅ 建立目錄結構
2. ✅ 建立 package.json、vite.config.js、.gitignore
3. ✅ `npm install vite peerjs puppeteer --save-dev`
4. ✅ 搬移媒體檔到 assets/
5. ✅ 搬移備份檔到 backups/
6. ✅ 建立驗證腳本 scripts/verify.cjs
7. ✅ 建立 CLAUDE.md
8. ✅ **驗證**：`npm run dev` 能跑

### 階段 1：抽出 CSS + 精簡 HTML ✅ `6bd7d01`
1. ✅ CSS → style.css
2. ✅ HTML 中加 `<link>` 引用
3. ✅ JS 保持原樣在 `<script>` 中
4. ✅ **驗證**：遊戲正常

### 階段 2：建立核心模組 ✅ `6bd7d01`
1. ✅ state.js — 共享狀態物件 S
2. ✅ utils.js — 純工具函式
3. ✅ config.js — 常數、角色、模式
4. ✅ 主檔改用 `<script type="module" src="/src/main.js">`
5. ✅ main.js import 這三個模組，其餘邏輯暫時全放 main.js
6. ✅ **驗證**：遊戲正常

### 階段 3：逐一抽出獨立模組（每個模組完成後驗證 + commit）
順序（依賴性從低到高）：
1. ✅ cards.js（純資料）— `6bd7d01`
2. ✅ audio.js（只依賴 state）— `10ecd57`
3. ✅ render.js（依賴 state + config + utils）— 繪圖函式（玩家、敵人、粒子、特效）
4. ✅ hud.js（依賴 state + utils + render）— HUD、小地圖、提示
5. ✅ input.js（依賴 state）— 搖桿、鍵盤控制
6. ✅ enemies.js（依賴 config + state + utils）— 敵人生成、波次、成長曲線
7. ✅ combat.js（依賴 state + config + render + audio）— 射擊、揮劍、碰撞、擊殺結算
8. ✅ skills.js（依賴 state + combat + audio + render）— 角色技能、大招、閃避
9. ✅ cards-ui.js（依賴 state + cards + audio）— 卡片選擇 UI、天使卡、大寶箱
10. ✅ boss.js（依賴 state + combat + audio + render + enemies）— Stage Boss 系統
11. ✅ coop.js（依賴 state + 多個模組）— PeerJS 連線、狀態同步
12. ✅ practice.js（依賴 state + enemies + ui）— 練習模式
13. ✅ ui.js（依賴 state + audio + 多個模組）— 選單、設定、結果畫面、cutscene
14. ✅ loop.js（依賴所有模組 — 最後抽出）— 主遊戲迴圈

### 階段 4：清理 ✅
1. ✅ HTML onclick → 事件委派
2. ✅ 移除 window.xxx 暴露（剩 overGoHome/SG 供動態 HTML 使用）
3. ✅ 最終全面測試（build 通過）

### 階段 5：產出 ARCHITECTURE.md ✅（已完成）
重構完成後，必須在專案根目錄產出 `ARCHITECTURE.md`，內容包含：

1. **模組總覽表**：每個 src/*.js 的用途（一行描述）
2. **模組依賴圖**：哪個模組 import 了哪些模組（文字版）
3. **函式索引**：每個模組中的所有 export 函式，格式如下：
   ```
   ## combat.js — 射擊、揮劍、碰撞、擊殺結算
   - fire(angle, opts) — 發射子彈
   - swordSwing() — 劍士揮砍
   - shieldBash() — 坦克盾擊
   - tapAtk() — 攻擊觸發（搖桿/鍵盤共用）
   - awardEnemyKill(e) — 敵人死亡結算（經驗、掉落）
   ```
4. **共享狀態文件**：state.js 中每個欄位的用途
5. **遊戲流程圖**：標題 → 選角 → 遊戲中 → 卡片選擇 → Boss → 勝利 的狀態轉換
6. **常見修改指南**：
   - 「想改卡片效果？」→ 改 cards.js 的 ap 陣列
   - 「想改敵人行為？」→ 改 enemies.js + loop.js
   - 「想改 Boss 模式？」→ 改 boss.js 的 updateStageBoss
   - 「想加新角色？」→ 改 config.js CHAR + skills.js + render.js
   - 等等

---

## 關鍵風險
1. **closure 變數共享** → 用 state.js 的 S 物件解決
2. **HTML inline onclick** → 過渡期保留 window.xxx，最後清理
3. **loop.js 2400 行** → 不拆邏輯，只做 import 替換
4. **PeerJS CDN → npm** → 改 `import { Peer } from 'peerjs'`
5. **base64 精靈圖** → 保留在 config.js

## 驗證方式
- 每個階段完成後：`npm run build` 確認能打包 + 開瀏覽器確認遊戲可玩
- 每次 commit 前：自動驗證腳本（Puppeteer 檢查 Canvas 存在、無 JS 錯誤）
- 最終驗證：完整遊玩所有 4 個模式（classic, elite, coop, practice）確認無差異

---

## 共享狀態設計（state.js）

用一個 default export 物件，所有模組 `import S from './state.js'` 後用 `S.xxx` 存取：

```javascript
const S = {
  g: null, inv: [], inv2: [], par: [], _net: null,
  _stageBoss: null, _mode: "classic", _charType: "gunner",
  _isCoopMode: false, _practiceMode: false, _muted: false,
  _hitFlash: 0, _shakeT: 0, _shakePow: 0,
  // ... 其餘所有模組共享的 let/var 變數
};
export default S;
```

## vite.config.js

```javascript
import { defineConfig } from 'vite';
export default defineConfig({
  root: '.', base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});
```

## package.json

```json
{
  "name": "cute-rpg-action-shooter",
  "version": "5.47.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "verify": "node scripts/verify.js"
  },
  "devDependencies": {
    "vite": "^6.x",
    "peerjs": "^1.5.4",
    "puppeteer": "^24.x"
  }
}
```

## .gitignore

```
node_modules/
dist/
backups/
*.log
.DS_Store
Thumbs.db
參考資料，不須上傳/
```
