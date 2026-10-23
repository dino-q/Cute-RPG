# 刺客修正第四次審查（大招份額／P2 影襲冷卻）— 2026-10-24

範圍：尚未 commit 的 `src/skills.js`、`src/combat.js`、`src/loop.js`。對照 `2026-10-24-assassin-recheck2.md` 的 2 個問題，並特別檢查 while 迴圈會不會結束、有沒有程式碼被註解吃掉。靜態審查＋語法檢查＋刀數模擬，並參考 Zavier 的 Chrome 實測。

## Pre-flight
- ✅ 有未 commit 的改動，只動 3 個檔案，都跟這次的問題有關。

## 前次 2 項問題的處理結果
- ✅ **#1 目標數不能整除 8 時總傷害縮水**：`src/skills.js:335` 每刀份額改成 `budget*n/(24-n)`，`legsPer` 已經完全移除（全專案 grep 不到）。每隻需要的刀數是 ceil((24-n)/n)，n 隻加起來最多 23 刀，一定小於等於總刀數 24。用 node 模擬 n=1..8，需要的刀數分別是 23/22/21/20/20/18/21/16，全部 ≤24。`slice(0,8)` 讓 n 最多是 8，分母至少 16，不會除以 0 或變負數。每刀仍以 `budget-dealt` 封頂，單隻不會超過 rushBudget。精英關卡 Boss 的 budget 不同，但份額是依各自的 budget 按比例算，所需刀數一樣。
- ✅ **#2 CLIENT 端 P2 標記期間 HUD 顯示可用**：`src/skills.js:77` 施放時設 now+4400（標記 4000＋回歸最多 400）；`src/skills.js:294` 回歸完成、`src/skills.js:291` 倒地／死亡／不是刺客、`src/skills.js:254` P2 大招清標記，這三處都改成 now+1700。回歸開始的時間會比 4000 晚一幀，可能晚 1 幀才結束，但這時 `skills.js:76` 的守門會讓按鍵直接 return、不改冷卻，而且回歸完成時會重新設冷卻，所以不會造成問題。

## 你要求確認的事
- ✅ **大招出刀 while 迴圈一定會結束**：`src/skills.js:333-339`。每一輪只有兩種結果：`dmg<=1e-6` 就 `break`，否則 `rush.legCuts++`。條件 `legCuts<due` 的 `due` 最多是 3，所以每幀最多跑 3 輪。`/* */` 註解在 335 行行尾，裡面沒有 `*/` 提前結束；`if(dmg<=1e-6){rush.legVictim=null;break;}rush.legCuts++;` 已經獨立放在 336 行，會正常執行。`find`（`-1e-6`）和出刀（`<=1e-6`）的容許值一致，不會出現 find 找到、出刀又馬上跳出的空轉。
- ✅ **整份 diff 沒有其他程式碼被註解吃掉**：新增的 `//` 共 7 處（combat.js:454、loop.js:1580、skills.js:76、77、219、283、288）。行尾的 `//` 前面都已經用 `;` 結束敘述，後面沒有其他程式碼；整行的註解下一行都是正常的程式碼。三個檔案都用 `node --input-type=module --check` 檢查過，語法正確。

## 其他
- ✅ 1 隻目標時，23 刀後剩下的誤差會讓 `dmg≈0` 而 break，第 24 刀不會打出去，也不會卡住；下一幀 `find` 會排除額度已滿的怪。
- ✅ Silent failure、持久化、HTML 渲染：不適用。
- 專案沒有自動化測試，已用 Zavier 的真瀏覽器實測（1/3/5/7/8 隻都是 1200，冷卻 4.4→1.7）代替。

VERDICT: clean — safe to deliver
