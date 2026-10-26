# Dino RPG App 圖示

日期：2026-10-26
選定款：R2 可愛勇者。Dino 已在本次對話確認。
製作：內建 image_gen；依選定比較圖獨立輸出，保留圖案、移除白邊／編號、四角滿版。
技術輸出：以 Windows System.Drawing 等比例縮至 32、180、192、512px，不改圖案內容。母圖 1254×1254px。

## 檔案

- `C:/Users/AG_Di/Desktop/automation/Claude_code/side_project/Game/Cute-RPG-ActionShooter/assets/app-icon-r2.png`
- `C:/Users/AG_Di/Desktop/automation/Claude_code/side_project/Game/Cute-RPG-ActionShooter/assets/app-icon-r2-32.png`
- `C:/Users/AG_Di/Desktop/automation/Claude_code/side_project/Game/Cute-RPG-ActionShooter/assets/app-icon-r2-180.png`
- `C:/Users/AG_Di/Desktop/automation/Claude_code/side_project/Game/Cute-RPG-ActionShooter/assets/app-icon-r2-192.png`
- `C:/Users/AG_Di/Desktop/automation/Claude_code/side_project/Game/Cute-RPG-ActionShooter/assets/app-icon-r2-512.png`
- `C:/Users/AG_Di/Desktop/automation/Claude_code/side_project/Game/Cute-RPG-ActionShooter/assets/app.webmanifest`

## 套用

index.html 接上分頁圖示、Apple 主畫面圖示與 app.webmanifest。♻️ 沿用 Vite publicDir: assets，打包輸出至 dist 根層；manifest 使用相對路徑，支援 GitHub Pages /Cute-RPG/ 子路徑。未改遊戲玩法或數值。

## 最終圖片編修提示原文

Edit target: the attached three-icon comparison board. Deliver ONLY the CENTER icon R2 as a single square production app icon. Preserve faithfully the selected character's face, big brown eyes, dark tousled hair, orange scarf, armor, silver sword and warm orange magical background; do not redesign or swap character. Remove the presentation board, other two icons, all labels and heading. Fill the ENTIRE square canvas edge to edge with the R2 artwork, extending only its existing orange backdrop into all four corners, NO white margins, NO rounded outer mask, NO outside shadow, NO text. The operating system will apply its own rounded corners. Center composition and preserve readable face. Single high-resolution square icon.

## 驗證結果

RPG Vite production build：成功。
已用已安裝的 Chrome 實際載入 RPG 打包版、PTT site 與 PTT Handler 本機版，並檢視整頁截圖與 64px 圖示。

RPG build: PASS (links, MIME types, dimensions, relative paths, browser load)
PTT site: PASS (links, MIME types, dimensions, relative paths, browser load)
PTT local: PASS (links, MIME types, dimensions, relative paths, browser load)
Allowlist / query string: PASS
PTT site/web SHA-256 sync: PASS
37 assertions PASS

2026-10-26 Dino 明確授權「都可以套用上線了」。本機驗證完成，依既有 GIT_PUBLISH.md 發布；正式網址與發布方式沿用專案資訊.md。
