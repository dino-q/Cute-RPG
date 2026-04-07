#!/bin/bash
# 自動重構腳本 — 反覆呼叫 Claude Code 直到 PLAN.md 沒有 ⬜
cd "$(dirname "$0")/.."

while grep -q '⬜' PLAN.md 2>/dev/null; do
  echo "=== $(date) === 偵測到未完成模組，啟動 Claude Code ==="
  claude --print "讀 PLAN.md，從第一個 ⬜ 開始拆分模組。每完成一個就 build 驗證 + commit + 更新 PLAN.md 把 ⬜ 改成 ✅，然後立刻繼續下一個。至少完成 3 個再停。"
  echo "=== $(date) === Claude Code 結束，檢查是否還有 ⬜ ==="
done

echo "=== 全部完成！PLAN.md 已無 ⬜ ==="
