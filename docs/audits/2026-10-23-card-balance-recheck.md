# Angus 複審：卡片平衡 7 項修正

- 日期：2026-10-23
- 前次報告：`docs/audits/2026-10-23-card-balance.md`（7 issues）
- 範圍：尚未 commit 的 6 個檔案：`src/loop.js`、`src/cards.js`、`src/cards-ui.js`、`src/practice.js`、`src/skills.js`、`docs/附著與Boss視覺改版.md`。沒有動到無關檔案。
- 方法：逐行讀 diff；用 `node --check` 檢查 5 支 JS 的語法，全部通過；用 node 匯入 `src/cards.js` 核對卡片資料；從 caller 往回追 pks 的 P1／P2 背包參照，以及練習模式的切換流程。

## 原 7 項

- ✅ **(1) 守護星的 2 層被接觸傷害連續吃光**：loop.js:1319 在每隻怪進傷害前都重新檢查 `_iFrameEnd>now`，所以同一幀裡第二隻怪不會再扣層。loop.js:1320 擋下後給 400ms 無敵（Lv3 經過 `Math.max` 後仍是 1000ms），並設 `e._retreatEnd=now+800`。consumeGuardStar（loop.js:110）兩個呼叫點都用 `now`。遠程路徑（loop.js:1089）本來就在每顆子彈的條件式裡檢查無敵。唯一的 `_groundHit` 來源是 boss.js:539，它帶 absolute，只有 Lv3 擋得下，Lv3 也會給 1 秒無敵，所以地面大招不會一次吃掉 2 層。
- ✅ **(2) 召喚球「出擊更快」**：cards.js:92 的三級說明都已經沒有這幾個字，原始碼裡也 grep 不到。說明跟實際數值一致。
- ✅ **(3) 石膚術重複疊加**：cards.js:80 有 `_stoneSkin` 保護。node 實測連續套用兩次，armor 從 .15 變成 .218（只算一次），基礎 0 時是 .08。命運轉輪只清卡片清單，不會清這個旗標。practice.js:240 會清旗標，practice.js:233 會把 armor 還原成角色基礎值，所以重建時只會正確套一次。P2 是從 `armor:0` 開始，結果正常，不會出現 NaN。
- ✅ **(4) P2 拿到沒作用的守護星**：cards.js:86 有設 `p1Only=true`。cards-ui.js:57 用陣列參照判斷背包。P1 的 showPick 一律傳 `inv`（cards-ui.js:247，整個 src 沒有任何地方建 pickCtx），所以 P1 不會被誤擋。P2 選卡（coop.js:290）和重骰（coop.js:308）都經過 `_getInv2()`，它跟 cards-ui 的 `inv2` 是同一個陣列：main.js:213 每局重建後兩邊同時注入，之後只用 `length=0` 清空，參照不會分岔。
- ✅ **(5) once 卡註解**：cards.js:59 的清單跟 node 實測一字不差（自癒術、幸運幣、石膚術、鐵壁金身、影分身、閃電步、命運轉輪、達摩的光劍、連環殺戮）。守護星已經不是 once 卡，p1Only 也有設。
- ✅ **(6) 練習模式切 once 卡丟 TypeError**：practice.js:202 讓 once 卡的切換順序變成「未選 → Lv1 → 取消」。onclick 傳的是數字 id（practice.js:450），`===` 比對成立。practice.js:251 對 once 卡只跑 l=0。`_pracCardLvs` 只有這兩處和初始化（practice.js:431）會寫入，不會留下 once 卡卻停在 Lv2／Lv3 的狀態。
- ✅ **(7) 文件**：docs/附著與Boss視覺改版.md:39 已經補上「守護星 Lv3 例外」，跟 boss.js:539 加上 loop.js:1089 的實際行為一致。

## 新改動的副作用檢查

- ✅ **loop.js:1319 的位置**：它放在坦克擋衝刺和閃避判斷之後。同一幀裡，第二隻怪在無敵期間仍可能觸發閃避，跳出 MISS，有 `dodgeAtk` 的話還會反擊。這只是多一次對玩家有利的判定，以前一般受傷路徑也有一樣的順序，不算問題。`return true` 會讓這隻怪略過後面的 P2 接觸判定，但外層的 `!iFrameActive` 本來就會這樣，不是這次新增的行為。

## 兩項維持不改的備註：我的判斷

- 升級時如果沒有存層，會立刻送 1 層（cards.js:85）：**可以維持**。這跟時間停止、磁力場每次升級都送一次立即大招（`_resetUlt`）的設計一致，而且只有升級的那一下才會觸發，沒有辦法反覆刷層。
- Lv1 存滿時計時暫停，比改版前弱：**可以維持，不需要改程式**。改版前存滿時 `_shT` 還會繼續累積，擋下後下一幀就補滿，等於「放久了就隱藏存 2 層」，但說明從來沒寫這件事，算是意外行為。現在 Lv1 的行為跟說明「每8秒充能1層」一致，想存 2 層就要升到 Lv2，升級的意義也更清楚。如果要把 Lv1 調回改版前的強度，那是數值平衡的取捨，不是程式正確性的問題。

VERDICT: clean — safe to deliver
