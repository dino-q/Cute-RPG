# 刺客修正複審（大招傷害上限／P2 影襲獨立）— 2026-10-24

範圍：尚未 commit 的 `src/skills.js`、`src/combat.js`、`src/loop.js`（34 行新增、8 行刪除）。對照前一份報告 `2026-10-24-assassin.md` 的 4 個問題。靜態審查，並參考 Zavier 的 Chrome 實測數據。

## Pre-flight
- ✅ 有未 commit 的改動，只動 3 個檔案，都跟這次的問題有關。

## 前次 4 項問題的處理結果
- ✅ **#1 大招單一目標暴增**：`src/skills.js:331-333` 用 `rush.hits` 記錄每隻目標的累積傷害，上限 1.2D（菁英模式 stageBoss 為 min(1.2D, 5% mhp)），已確實封頂。單一目標 24 刀×1.2D/24＝1.2D，數學正確。
- ✅ **#2/#3 P2 影襲污染 P1**：P2 分支（`src/skills.js:200-206`）完全不碰 `g._shadowReturn` 和 `_skillCdEnd`；回歸邏輯在 `src/skills.js:285-292`；`combat.js:454` 的 ×1.5 已改成各算各的。P2 大招會清掉自己的標記（`skills.js:253`），P1 大招則經 `releaseShadowLock`。
- ✅ **#4 測試缺口**：已有真瀏覽器實測數據，可以接受（專案沒有測試框架）。

## 新發現

- ❌ **大招打一群擠在一起的怪時，大部分目標吃不到傷害**。`src/skills.js:321`，搭配 `src/skills.js:332`。
  - 每段砍誰由 `rush.legVictim` 決定：從依距離排序的 `rush.targets` 裡，找第一隻在路徑上的怪。它不會跳過額度已經用完的目標。
  - 8 隻擠在一起時 legsPer=1，每刀份額 1.2D/3，所以第 1 段砍完，最近那隻就吃滿 1200。後面幾段的路徑上通常還是先找到同一隻，`dmg<=0` 時 `break`，這整段就沒打到任何怪。
  - Zavier 的實測結果 `1200,0,0,1200,0,0,1200,0` 正是這個現象：8 隻只有 3 隻受傷，總傷害 3.6D，設計應該是 8 隻各 1.2D。修掉暴增之後，「群體大招」在最常見的擠成一團情境變成只打 3 隻。
  - 處理方式：在 `legVictim` 的 `find` 條件裡排除 `(rush.hits.get(enemy)||0) >= 該目標的 budget` 的怪（budget 公式要跟 331 行共用，例如抽成一個小函式）。驗收方式：同一組 8 隻木樁，每隻都應約 1200。

- ⚠️ **P2 影襲的冷卻跟 P1 不一致，標記期間按技能會被吃掉**。`src/skills.js:71-77`（`p2UseSkill`），搭配 `src/skills.js:200-201`。
  - `p2UseSkill` 先把 `_p2SkillCdEnd` 設成 now+1700，再呼叫影襲。標記期間（4 秒）的 1.7 秒後冷卻就結束了，雙人 CLIENT 端 HUD（`coop.js:423` 的 `p2SkillCd`）會顯示技能可用，但按下去只是在 201 行 `return`，冷卻又被重設，畫面上看不出任何反應。電腦控制的 P2 也會每 1.7 秒空放一次。
  - 回歸完成後，P2 沒有 P1 那段「回歸後 CD 1.7 秒」，冷卻可能早就跑完，可以立刻再放。
  - 處理方式：`p2UseSkill` 遇到 `g.p2._shadowMark` 就直接 return、不扣冷卻（或在施放時把 `_p2SkillCdEnd` 鎖住）；回歸完成時（`skills.js:291` 的 q>=1 分支）呼叫 `setP2SkillCdEnd(now+1700)`，P2 倒地清標記時也一樣。

- ⚠️ **練習模式切換 P2 職業時沒有清掉影襲標記**。`src/practice.js:396`（`pracCycleP2Char`），搭配 `src/skills.js:287`。
  - P2 刺客放了影襲後切成槍手、劍士或坦克，標記還在，最多 4 秒後非刺客的 P2 會被拉回原位，回歸期間手動移動和 AI 移動也會暫停。大招那邊有檢查 `charType`（`skills.js:295`），標記這邊沒有。
  - 處理方式：在 `skills.js:288` 的清除條件加上 `p2.charType!=='assassin'`，或在 `pracCycleP2Char` 裡設 `g.p2._shadowMark=null`。

## 你要求確認的情境
- ✅ **換局**：`src/main.js:229-232` 每局都會重建 `g.p2` 物件，標記不會帶到下一局。練習模式開關雙人（`practice.js:372`／`381`）也會重建或清掉 `g.p2`。
- ⚠️ **練習模式重置**：`pracSwitchChar`（`practice.js:337`）只重置 P1，對 P2 沒影響，這是對的。P2 的問題在 `pracCycleP2Char`，見上面第 3 條。
- ✅ **雙人 CLIENT 渲染**：P2 位置由 HOST 決定，透過快照傳給 CLIENT（`coop.js:391` 送 x/y）。`updateAssassinUltimates` 和 P2 的移動區塊都在 HOST 專用的區段（`loop.js:229` 起），CLIENT 不需要知道 `_shadowMark`，回歸的滑動會照常顯示。標記圈（`loop.js:1793`、`2020`）本來就只畫 `g._shadowReturn`，而且從來沒有同步給 CLIENT，所以 CLIENT 玩家以前也看不到自己的標記，不算這次造成的。唯一的差別是 HOST 畫面上看不到電腦 P2 的標記圈，只影響外觀。`packCardPlayer` 只把 `_bladeRush` 當成布林值傳送，`rush.hits` 這個 Map 不會被序列化。
- ✅ **P2 選卡期間（`_pickPending`）**：手動移動本來就擋掉了。標記計時和回歸滑動會繼續跑，但 P2 這時是 `_inv`，回歸也有無敵，不會造成傷害或卡住。換成全局暫停（`g.run=false`）時，計時用的是實際經過的時間（`now-mark.t`），恢復後如果已經超過 4 秒會立刻回歸。這跟 P1 原本的 `g._shadowReturn` 行為一樣，不算新問題。
- ✅ **`rush.hits` 原本有沒有別的用途**：HEAD 版只在建立時寫了 `hits:new Map()`（`skills.js:240`），全專案沒有任何地方讀它。網路同步也不會傳。拿來記傷害不會跟其他功能衝突。

## 其他
- ✅ 回歸滑動每一幀都直接設定 P2 座標，P2 閃避（`loop.js:546`）和擊退造成的位移都會被蓋掉，不會被推離軌道。回歸的最後一幀清掉標記後，同一幀的移動才恢復，順序正確（`loop.js:235` 在 262 之前）。
- ✅ Silent failure、持久化：不適用，沒有新增。

VERDICT: 3 issues found — fix and re-audit
