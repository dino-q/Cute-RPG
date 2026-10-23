# Angus 審查：惡魔連招／瞬移恢復／追蹤彈全時轉向

- 日期：2026-10-23
- 審查對象：commit `cfbbe5e`（審查進行中由主 agent commit；內容與當初未 commit 的 diff 相同，另多了 `rift` 的 `lockAt=now+warning*.58`，以及 P2 的 `homingR` 改用 `g.p2.homingR`）
- 檔案：src/boss-patterns.js、src/boss.js、src/combat.js、src/loop.js
- 報告位置說明：`system/Agent_Team/workspace/angus_audits/` 不存在，依派工指示改寫到本資料夾

## Pre-flight
- ⚠️ 審查開始時 `git status` 有 4 檔未 commit，審查途中被 commit 成 `cfbbe5e`。我改成審查 `git show HEAD`。改動範圍只有 4 檔，沒有碰到無關檔案。

## Checklist

- ❌ **追蹤彈新轉向法會讓子彈繞圈卡住，而且玩家子彈不會自然消失** — `src/loop.js:770`、`src/combat.js:145`、`src/loop.js:761-773`
  - 現在改成固定角速度 `hm*2.2*dt`、速度固定 7.5，迴轉半徑 R = 7.5/(hm*2.2)：Lv1（hm .03）約 114px，Lv2 約 57px，Lv3 約 34px。目標落在迴轉圈內就會變成穩定繞圈，永遠打不到。
  - 玩家子彈 `g.bul` 的 filter 只看「離玩家 VW/VH 範圍」和 `life>0`，**沒有隨時間扣 life**，所以繞圈的子彈會一直留在畫面上。`fire()` 在 `g.bul.length > MAX_BULLETS(120)` 時直接 return，子彈繞圈累積到上限後**玩家會打不出子彈**。
  - 用 node 數值模擬（目標靜止，從 0~360° 各方位、距離 40~190px 起射，跑 600 幀）：

    | 等級 | 新寫法卡住比例（敵人 r=16） | 舊寫法 |
    |---|---|---|
    | Lv1 | 72/180（40%） | 12/180 |
    | Lv2 | 26/180 | 0 |
    | Lv3 | 8/180 | 0 |

    目標會朝玩家移動（1.2px/幀）時，Lv1 和 Lv2 仍有約 19% 卡住。加上這次改成每一顆都追蹤（原本只有 1/7 的時間），影響會被放大。
  - 建議（三選一或合併）：(a) 追蹤彈每幀扣 life，或記錄「追蹤幀數」，超過上限就停止追蹤（`hm=0`）讓它直線飛出畫面；(b) 距離目標小於 R 時提高轉向速率，或允許減速；(c) 至少替玩家子彈加上存活時間上限，避免撞到 MAX_BULLETS。
  - NaN 檢查沒問題：`atan2(0,0)=0`，`bs` 有 `||7.5` 保底；dt 在 `loop.js:226` 被限制在 33ms 以內（dt≤約2），`Math.min(|diff|, rate)` 不會轉過頭。

- ⚠️ **連招間隔會閃出「失衡・反擊」，而且這段時間沒有接觸傷害** — `src/boss-patterns.js:97` 和 `src/boss-patterns.js:110`、`src/loop.js:1284`
  - 招與招之間的 260/420ms 是借用 `_patternRecoveryEnd` 擋住其他攻擊，但 `drawBossPatternGround` 只要 `_patternRecoveryEnd>now` 就會畫 guardian 底圖和「失衡・反擊」字樣。雙人模式 CLIENT 會透過 `recovery` 同步收到同樣的值（`coop.js:392/447`），所以兩邊都會閃。這會讓玩家誤以為有反擊空檔，衝上去時正好吃下一招。`loop.js:1284` 也會在這段間隔取消王的接觸傷害（影響小）。
  - 建議：連招間隔另外用一個欄位（例如 `_comboGapEnd`），在 `updateBossPattern` 開頭和 `boss.js:284` 的 casting 判斷都把它算進去；或讓繪圖判斷排除 `_comboLeft>0` 的情況。雙人模式的 CLIENT 需要同步這個欄位才能一致。

- ✅ **階段切換（boss.js:284）不會被連招卡死** — 連招進行中有 `_pattern` 或 `_patternRecoveryEnd>now`，所以 casting 為 true，不會在連招中途換階段（符合原本設計）。phase 2 每輪結束後有兩段空檔：recovery 結束到 +600ms 瞬移開始，以及瞬移結束（+1600）到下一輪 +1800；不需要瞬移時空檔有 1800ms，可以順利進入 phase 3。phase 1 沒有瞬移，空檔 1800ms。
- ✅ **phase 3 的 free→idle 改用 `Math.min`** — `boss.js:560`。free 期間連招進行時，`updateBossPattern` 回傳 true 並提早 return（`boss.js:397`），所以 free→idle 只會在 rest 之後判斷，這時 `sbTeleCD` 一定是 rest 剛設的新值。三招連招最短約 5.7 秒，大於 free 的 5 秒，不會連續兩輪連招而跳過衝刺循環。`sbTeleCD` 為 0 時走 `Infinity` 保底，沒問題。
- ✅ **clearBossPattern 狀態乾淨** — `_comboLeft/_comboStep` 都會歸零。`_lastPatternType` 留著只影響下一招的隨機池，沒有副作用。暫停補時（`gap>250`）會同時平移 `_patternAt` 和 `_patternRecoveryEnd`，連招間隔也會跟著平移。
- ✅ **拿掉 `g.ebul=[]`** — `_groundHit` 判定子彈的 life 是 .015，下一幀就會用掉；連招下一招最快也在 260ms 後才開，不會殘留。拿掉之後反而不會再把前一招還沒結算的地面判定清掉。除了 Boss 登場和死亡時的清空（`boss.js:162/644/655`），沒有其他地方依賴開招時的清空。
- ✅ **Lv20 便便王行為不變** — `combo` 限定 `stageBoss===30`；phase 仍然依 HP 計算；recovery 仍是 `p.recovery||2600`；`rest()` 的 Lv20 分支仍是 `Math.max(...+2500)`。多出來的 `pool/_lastPatternType` 計算對 Lv20 沒有作用。
- ✅ **雙人模式** — 連招狀態（`_comboLeft/_comboStep/_lastPatternType`）只在 HOST 的 `updateStageBoss` 使用（`loop.js:227` 以下只有 HOST 執行）。`_pattern` 含 `lockAt`、`_patternRecoveryEnd` 仍照原本方式同步；「連招N・」字樣走 `g.dn`，和原本一樣。唯一受影響的是上面那條「失衡・反擊」閃現。
- ✅ **art-preview** — 它傳入 `sbPhase:1`，`combo=false`，所以走原本的 `sequence%4` 路徑，結束時 `rest()` 只改預覽物件，沒有副作用。（題外話，不是這次造成的：預覽選「張翼衝刺」時 sequence=0，實際播的是 claw；選「旋轉 X 裂界」時 sequence=1，實際播的是 wing（`art-preview.js:59`），這是原本就有的對應錯誤。）
- ✅ **Tests** — 專案沒有單元測試。主 agent 已回報 `npm run build` 成功並在真 Chrome 實測過，我沒有重跑。

VERDICT: 2 issues found — fix and re-audit
