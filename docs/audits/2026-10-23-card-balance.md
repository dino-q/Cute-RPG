# Angus 審查：卡片平衡（守護星／時間停止可升級、召喚球暴擊、數值調整）

- 日期：2026-10-23
- 範圍：未 commit 的 `src/cards.js`、`src/loop.js`、`src/skills.js`、`src/practice.js`（git diff 4 檔、+19/-16，沒有動到無關檔案）
- 方法：逐行讀 diff；用 node 直接 import `src/cards.js`，把各卡 Lv1→Lv3 依序套到假角色上，核對最後數值；從 caller 往回追選卡池、命運轉輪、練習模式、P2、coop 同步

## Checklist

- ✅ **(1) applyCardLevel 升級帳本，數值有沒有重複疊加**：node 實測 Lv1→Lv3 依序套用，結果都等於 Lv3 的總值，沒有重複疊加。元素精通 atk 10→20、elemBoost 1.5；回血斬 atk+10、ls+25；破甲箭 atk+12、armorCapBonus .5、pierce 1；機關槍 atk 10→7（-3）、fr .5（由 CARD_SPEED 覆蓋）。守護者光環在坦克 armor .15 的基礎上算出 .32＝1-(.85×.80)，帳本把 `armor+=x` 正確換算成乘法減傷，升級時也會先除掉前一級。石膚術單次套用得 armor .218、contactCap 30，正確。召喚球 Lv3 為 orbiters 3、_orbPower 2.8、_orbRange 420。時間停止 Lv3 為 tsFrzDur 4000、tsCd 9000。
- ✅ **(3) consumeGuardStar 的位置與 `now`**：函式放在 module 層（loop.js:110），兩個呼叫點都在 `loop()` 裡。loop.js:1089 在 ebul 的 filter callback 裡，閉包可以取用 loop.js:228 的 `const now`；loop.js:1319 雖然傳的是 `performance.now()`，但它跟 `now` 的差距不到一幀，行為上沒有差別。loop.js:598 的 `var _shN` 在 `loop()` 裡沒有撞名。充能邏輯的分支都核對過：層數滿了計時就停、扣一層後計時接著跑、充滿後歸零。
- ✅ **(4) 時間停止每級都設 `_resetUlt`**：cards-ui.js:121、coop.js:329 收到後會把 ultCharge 和 ultCdEnd 歸零，也就是每次升級都多送一次立即可放的大招。黑洞（cards.js:108）、磁力場（cards.js:72）每級本來就這樣做，三張卡一致。hud.js:80、skills.js:385、skills.js:392 都讀 `player.tsCd`／`tsFrzDur`，P1 和 P2 都吃得到新數值。
- ✅ **選卡池 pks／練習重置**：cards-ui.js:59 對沒有 once 的卡允許到 lv<2，守護星和時間停止現在可以出 Lv2、Lv3。practice.js:228 會清帳本，practice.js:240 會清 `_shN/_shMax/_shLv`；`guardStar` 用 `if(!s._sh)` 保護，練習模式重建 Lv3 時只會初始化一次。
- ✅ **coop 同步**：coop.js:376 只同步 `_sh`（給 client 畫護盾用），`_shN` 由 host 決定、client 不需要；召喚球的 `big:orbCrit` 會跟著 `dn` 一起序列化。
- ✅ **命運轉輪 × 守護星／時間停止**：命運轉輪只清掉卡片清單、不重置數值，帳本 `_cardStatLevels` 也保留著。重抽到同一張卡、等級沒超過以前的話，applyCardLevel 會直接 return，數值維持原本較高的那一級。這跟其他可升級卡的既有行為一樣，沒有重複疊加。
- ✅ **召喚球暴擊**：倍率 ×2，跟子彈一致（loop.js:1129）；護甲 Boss 仍套 .7，每幀還有 `applyBossDamageBudget`（loop.js:1557）限制上限。

- ❌ **守護星的「可存 2 層」被接觸傷害連續吃光**：**loop.js:1319。** 擋下接觸傷害後只 `return true`，沒有給無敵時間，敵人也不會後退。一般受傷路徑會設 `_iFrameEnd=now+400`，敵人消失或後退（loop.js:1338、1346）。結果同一隻怪下一幀還貼著主角：第 N 幀扣第 1 層、N+1 幀扣第 2 層、N+2 幀照樣受傷，Lv2 的第 2 層等於只多擋約 16ms。Lv3 雖然會給 1 秒無敵，但 `iFrameActive` 在 loop.js:1274 進 filter 前就算好了，同一幀裡另一隻貼身的怪還是能扣掉第 2 層。以前只有 1 層，所以沒有浮現。**處理**：擋下後至少加上 `g.p._iFrameEnd=Math.max(g.p._iFrameEnd||0,now+400)` 和 `e._retreatEnd=now+1500`，再把 filter 內的無敵判斷改成每隻怪都重新檢查。
- ⚠️ **召喚球 Lv2→Lv3 的「出擊更快」沒有作用**：**skills.js:354 搭配 cards.js:92。** 下一次出擊時間算法是 `nextAt=now+Math.max(0,_orbCD-400)`，_orbCD 450/400/330 算出來的間隔是 50/0/0ms，所以 Lv3 的 330 和 Lv2 的 400 完全一樣，Lv1→Lv2 也只快 50ms。**處理**：調整 `_orbCD` 數值讓它大於 400，或改算法；不然就把說明裡的「出擊更快」拿掉。
- ⚠️ **石膚術加了 armor 後，碰上命運轉輪會重複疊加**：**cards.js:80。** 石膚術仍是 once 卡，會直接 apply（cards.js:54），不經過帳本。命運轉輪（cards-ui.js:122-124）清掉卡片清單後，once 卡又會進選卡池（cards-ui.js:59 判斷 `_getClv<0`），重抽到石膚術就再乘一次 .92，受傷減免從 8% 變成約 15.4%。改版前只設 `contactCap=30`，重複套用不會有事。**處理**：apply 前先檢查旗標（例如 `if(!s._stoneSkin){...;s._stoneSkin=1}`），或讓 armor 改走帳本。
- ⚠️ **P2 會拿到完全沒作用的守護星，而且現在最多 3 次**：**coop.js:290 / coop.js:313-319 搭配 loop.js:598。** 護盾充能和擋傷判斷只看 `g.p`，P2 的受傷路徑（loop.js:1109-1113）也沒有判斷 `_sh`。以前是 once 卡，P2 最多浪費 1 次選卡；現在 Lv2、Lv3 還會再出現，說明也寫「可擋Boss大招」，等於誤導。**處理**：補上 P2 的護盾邏輯，或在 P2 的選卡池排除守護星。
- ⚠️ **once 卡註解清單錯誤**：**cards.js:59。** 清單列了「磁力場」，但磁力場（cards.js:72）沒有 once 旗標，而且是可升級卡（3 級描述各不同）。node 實測 once 卡實際是：自癒術、幸運幣、石膚術、鐵壁金身、影分身、閃電步、命運轉輪、達摩的光劍、連環殺戮，共 9 張。把清單裡的「磁力場」刪掉即可。
- ⚠️ **（既有問題，在這次改到的卡上）練習模式把石膚術切到 Lv2 會丟 TypeError**：**practice.js:252 搭配 cards.js:80。** 石膚術的 `ap` 只有 1 個函式，但 pracCycleCard（practice.js:199-204）不分 once，一律能切到 Lv2、Lv3，所以 `cd.ap[1]` 會是 undefined。外層 try/catch（practice.js:205）會吞掉錯誤，但後面的卡和 hp/maxHp/expR 重設（practice.js:255-257）都不會執行。**處理**：once 卡在 pracCycleCard 最多只到 Lv1，或改用 `cd.ap[Math.min(l, cd.ap.length-1)]`。
- ⚠️ **文件與新行為不一致**：**docs/附著與Boss視覺改版.md:39** 寫「普通閃避機率與守護星不抵消原脈衝」，但現在守護星 Lv3 能擋 Boss 脈衝（boss.js:539 `queueBossGroundHit(...,true)`）。請把文件補一句「Lv3 例外」。

## 備註（不計入問題數）

- 升級守護星的當下如果沒有存層（`_sh=false`），`guardStar` 會立刻送 1 層，並把 `_shT` 歸零（cards.js:85）。這可以當成升級獎勵；如果不是設計本意，就要改。
- Lv1 的節奏跟改版前不同：以前存滿時計時還會繼續累積，擋下後幾乎立刻補回；現在存滿時計時暫停，擋下後要重等 8 秒。這符合這次說明的「計時只在層數未滿時累加」，只是提醒 Lv1 實際上變弱了。
- 這次沒跑測試：專案沒有針對卡片的單元測試，`npm run verify` 屬於整套驗證（Ray 的範圍）。

VERDICT: 7 issues found — fix and re-audit
