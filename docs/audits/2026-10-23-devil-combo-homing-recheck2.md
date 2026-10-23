# Angus 第三次審查：追蹤彈停止追蹤後外觀變回普通子彈

- 日期：2026-10-23
- 審查對象：未 commit 的 `git diff`（src/boss-patterns.js、src/boss.js、src/loop.js，共 3 檔）
- 前一份報告：`2026-10-23-devil-combo-homing-recheck.md`（1 issue）

## Pre-flight
- ✅ 有未 commit 的改動，範圍還是同樣 3 個檔案，沒有碰到無關檔案。boss-patterns.js／boss.js 的部分跟上次複審時一樣，沒有再變動。

## 上次的問題

- ✅ **追蹤彈停止追蹤後外觀從星星變回普通子彈**：`src/loop.js:771-773`
  - 771：`if(b._hmT>48)b._hmDone=1;/* keep hm so the star look stays */`。用的是區塊註解，同一行後面沒有程式碼被註解掉。
  - 772：`if(b._hmT){b._hmAge=(b._hmAge||0)+dt;if(b._hmAge>150)return false;}` 獨立成一行，計時和 150 幀移除都還有效。
  - 773：追蹤判斷改成 `b.hm>0&&!b._hmDone`。`_hmT` 只在這個分支裡面累加，所以 `_hmDone` 設下去之後 `_hmT` 就停在 48 多一點，`_hmAge` 照常計時。
  - `node --check src/loop.js` 通過，沒有語法錯誤。
  - `hm` 一直保持原值，所以 `role-card-art.js:148` 的 `b.hm>0&&cards['追蹤彈']` 在整段飛行期間都成立，會一直畫星星。雙人模式 `coop.js:393` 同步的也是 `hm`，CLIENT 看到的外觀一樣不會變，`_hmDone` 不需要同步（CLIENT 不跑追蹤邏輯）。

## 整份 diff 再檢查一次

- ✅ **還有沒有別的地方把 `hm` 當成「正在追蹤」**：整個 src 讀取 `b.hm` 的只有 `loop.js:773`（追蹤轉向）和 `role-card-art.js:148`（繪圖）。`art-preview.js:69` 是預覽用的假子彈，不經過這段 filter。沒有其他邏輯會因為 `hm` 保持非 0 而誤判。
- ✅ **同 pattern 的殘留**：src 裡已經沒有任何地方把 `hm` 設成 0 當作停止追蹤。
- ✅ **連招間隔的 `_comboGapEnd`**：`boss-patterns.js:17/28/32/98`、`boss.js:284` 跟上次複審一致，`_patternRecoveryEnd` 一樣只剩 `rest()`（`boss-patterns.js:10`）會設定，沒有退步。
- ✅ **Tests**：專案沒有單元測試。主 agent 回報 build 成功，node 模擬最壞情況 10 秒後 Lv1/2/3 繞圈子彈都是 0/180，我沒有重跑。

VERDICT: clean — safe to deliver
