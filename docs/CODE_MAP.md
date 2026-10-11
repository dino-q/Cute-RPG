# 程式碼地圖

| 函式 | 位置 | 用途 |
|---|---|---|
| drawPlayer | src/render.js | 各職業及分身的共用角色繪圖入口；沿用槍手分支接入八方向圖片。 |
| fire | src/combat.js | 原有子彈、元素傷害與射擊粒子。 |
| getG / setG / setCx | src/render.js | 取得遊戲狀態與繪圖畫布。 |
| charCfg | src/config.js | 職業數值與預設值。 |
| loop / clientRenderLoop | src/loop.js、src/coop.js | 單人／雙人主機與連線客戶端共用 drawPlayer。 |

| gunnerSpriteReady | src/gunner-sprite.js | 載入八方向圖片及位置資料，失敗時沿用原本外觀。 |
| getGunnerPose | src/gunner-sprite.js | 將任意瞄準角度對應八方向圖片。 |
| getGunnerMuzzle | src/gunner-sprite.js | 取得圖片的槍口座標，供子彈與火光共用。 |
| drawPixelGunner | src/gunner-sprite.js | 繪製像素角色、後座及槍口火光，保持畫布狀態。 |
| prepare | scripts/prepare-gunner-sprites.py | 沿用 generate2dsprite 素材處理器並匯出八方向共用尺度與槍口資料。 |

♻️ 沿用 drawPlayer、fire、loop、clientRenderLoop。
🆕 新寫 getGunnerPose、getGunnerMuzzle、drawPixelGunner（既有幾何角色沒有圖片方向與槍口位置資料）。

| pixelEmblem / cardEmblem | src/button-art.js | 共用像素徽章與卡片效果圖案。 |
| setActionEmblem / installGameButtons | src/button-art.js | 技能名稱、快捷鍵與職業選擇按鈕。 |
| meleeSpritesReady / swordActionsReady | src/melee-sprite.js | 載入三職業人物與全身劍術關鍵姿勢。 |
| drawPixelMelee | src/melee-sprite.js | 八方向轉身，連續盾擊／突刺與四階段全身橫斬。 |

♻️ 沿用 drawPlayer、fire、swordSwing、shieldBash、daggerStrike、getWpn 與原技能／卡片效果。
🆕 新寫共用按鈕徽章與像素近戰繪圖（原本幾何球體沒有全身姿勢與圖片手部錨點）。

| assassinActionsReady / tankShieldReady | src/melee-sprite.js | 載入全身雙短刀四階段動作與八方向直立盾牌。 |
| prepare-eye-weapon-revision.py | scripts/prepare-eye-weapon-revision.py | 匯出生成的點狀眼修正版、雙刀動作與盾牌；共用頭部尺度和腳底對齊。 |

♻️ 沿用 drawPixelMelee、cardEmblem、pixelEmblem、toggleStatsPanel、openSettings。
🆕 新寫素材載入與匯出流程（既有素材只有單刀與程式繪製盾牌）。

| createRolePortrait | src/button-art.js | 讀取正面人物的可見範圍，以原生像素置中，避免透明留白和武器徽章遮擋。 |

♻️ 沿用 installGameButtons、pixelEmblem 與既有角色圖。
🆕 新寫 createRolePortrait（CSS 背景定位只會對齊整格，無法依每位角色可見範圍置中）。

| drawSpriteWithEyes | src/sprite-eyes.js | 用逐格座標遮掉原眼睛，繪製固定 2×2 原生格眼睛；同次繪圖雙眼使用相同整數尺寸與高度。選角、槍手與全身近戰動作共用。 |

♻️ 沿用 drawPixelGunner、drawPixelMelee、createRolePortrait。
🆕 新寫 drawSpriteWithEyes（既有 PNG 眼睛尺寸不一致，生成及縮放无法保證一致）。

♻️ 沿用 drawPixelMelee：坦克盾牌按各方向本體範圍裁繪並縮小為 75%；盾擊衝擊弧由同一繪製入口處理，供單人、雙人及展示頁共用；loop 不再疊加舊版坦克模糊特效。
