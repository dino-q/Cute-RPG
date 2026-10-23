# Angus 複審：追蹤彈繞圈／連招間隔誤顯示「失衡・反擊」

- 日期：2026-10-23
- 審查對象：未 commit 的 `git diff`（src/boss-patterns.js、src/boss.js、src/loop.js，共 3 檔、+9/-6）
- 前一份報告：`2026-10-23-devil-combo-homing.md`（2 issues）

## Pre-flight
- ✅ 有未 commit 改動，範圍只有 3 檔，都跟前一份報告的兩個問題有關，沒有碰到無關檔案。

## 前一份報告的兩個問題

- ✅ **追蹤彈繞圈／累積到 MAX_BULLETS** — `src/loop.js:771-772`
  - `_hmT` 只在 `nr&&nd<hmR`（真的轉向）時累加，超過 48 幀後下一幀 `hm=0` 改直線飛。Lv1 每幀轉 .066 rad，48 幀共約 3.2 rad，夠轉半圈以上，不會讓正常追蹤失效。
  - 曾追蹤過的子彈 `_hmAge>150` 幀（約 2.5 秒、約 1125px）直接移除，繞圈和累積到 `MAX_BULLETS`（`combat.js:145`）的路徑都封死。
  - 從來沒進入追蹤範圍的子彈 `_hmT` 是 undefined，不會被 `_hmAge` 計時，維持原本「飛出畫面才消失」。
- ✅ **連招間隔誤顯示「失衡・反擊」** — `src/boss-patterns.js:17/28/32/98`、`src/boss.js:284`
  - `_comboGapEnd` 有在四個地方處理：開頭 return true、暫停補時 shift、`clearBossPattern` 歸零、階段切換的 casting 判斷。`_patternRecoveryEnd` 只剩 `rest()`（`boss-patterns.js:10`）會設定，所以繪圖（`boss-patterns.js:111`）只有在真正的恢復期才顯示提示。
  - 連招間隔期間 `updateBossPattern` 一樣回傳 true，`boss.js:397` 提早 return，不會移動、不會觸發瞬移，行為跟修改前相同。

## 指定要確認的項目

- ✅ **其他設定 hm 的子彈會不會被 `_hmAge` 誤刪** — 整個 src 只有 `combat.js:177`（一般射擊）會把 `hm` 設成非 0。大招子彈 `skills.js:120` 是 `hm:0, pierce:999`，不會進追蹤分支，也不會被計時。迴力鏢是獨立的 `g._booms` 系統（`loop.js:1484`），不經過 `g.bul`。沒有任何地方複製子彈物件（沒有 `{...b}`），不會把 `_hmT/_hmAge` 帶到新子彈上。
- ✅ **命中判定／穿透** — 命中判定在 `loop.js:1124`，只看 `b.life` 和距離，跟 `hm/_hmT` 無關。穿透子彈（Lv3 追蹤 +1 穿透）穿過目標後，最多 150 幀會被移除。這只會讓「追蹤過又穿透」的子彈比較早消失（約 1125px，大多已經飛出畫面），不影響傷害計算。
- ✅ **P2 子彈** — 同一段 filter 用 `_isP2` 選 `g.p2.homingR`，`_hmT/_hmAge` 存在子彈物件上，P1、P2 互不影響。
- ✅ **雙人 CLIENT** — CLIENT 直接用 `g.bul = data.bul`（`coop.js:449`），不跑 `loop.js` 的 filter。被移除的子彈下一次同步就消失。`_comboGapEnd` 不同步是對的：CLIENT 只用 `_patternRecoveryEnd`（`recovery`）繪圖，連招間隔不再寫入這個欄位，CLIENT 也不會閃出提示。
- ✅ **接觸傷害** — `loop.js:1286` 只排除 `_pattern` 和 `_patternRecoveryEnd`，所以連招間隔的 260/420ms 會照常算接觸傷害，符合這次的修改目的。
- ✅ **第二階段沒觀察到瞬移是正常的** — `boss.js:456-458`：冷卻到了以後，要 `di(e,_sbt) > e.r+PR+55` 才會瞬移，否則只把 `sbTeleCD` 往後延 8 秒、不瞬移。玩家站著不動、魔王已經走到近距離，本來就不會觸發。想實測瞬移，要讓玩家持續拉開距離。

## 新發現

- ⚠️ **追蹤彈停止追蹤後，外觀會從星星變回普通子彈** — `src/role-card-art.js:148`、`src/loop.js:771`、`src/coop.js:393`
  - `drawRoleBullet` 用 `b.hm>0&&cards['追蹤彈']` 決定要不要畫星星。現在追蹤 48 幀後 `hm=0`，沒打中的子彈（或穿透後繼續飛的 Lv3 子彈）會在飛行途中突然換外觀。雙人模式同步的也是 `hm`，所以 CLIENT 也會看到一樣的變化。不影響傷害，只是畫面上看得出來。
  - 建議：改成另外用一個旗標停止追蹤（例如 `b._hmDone=1`，追蹤判斷改成 `b.hm>0&&!b._hmDone`），`hm` 保持原值讓繪圖照舊；或者繪圖改看 `b.hm>0||b._hmT`，並把 `_hmT` 加進 `coop.js:393` 的同步欄位。
- ✅ **Tests** — 專案沒有單元測試；主 agent 已回報 build 成功、node 模擬和真 Chrome 實測都通過，我沒有重跑。

VERDICT: 1 issues found — fix and re-audit
