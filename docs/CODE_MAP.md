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

| initControlLayout | src/control-layout.js | 建立裝置版面編輯、項目清單、拖曳與雙指缩放事件，串接原設定與 resize。 |
| openLayoutEditor | src/control-layout.js | 暫存直／橫式配置，提供滑桿、還原、取消及本機儲存。 |
| getLayoutViewport | src/control-layout.js | 沿用安全邊界，計算可移動與獨立寬高的遊戲畫面；空白區為黑邊。 |
| applyControlLayout | src/control-layout.js | 套用裝置百分比位置及比例，介面顯示與尺寸變化時重新定位。 |

♻️ 沿用 resize、openSettings、resetControls、setStick、drawPixelMelee。
🆕 新寫 control-layout 模組（既有設定無版面資料、手勢編輯及方向別儲存）。坦克手臂位移縮至 2 原生單位、身體推出 3 單位，先畫前臂再畫盾牌。

| CARD_PALETTES / cardWeaponAtlas | src/card-vfx.js | 元素金屬材質與升級刻紋快取；排除臉部，沿用全身動作。 |
| drawCardPlayerLayer / drawCardGun / drawCardStrike | src/card-vfx.js | 背後羽翼、身前護甲、槍口套件、像素揮砍。 |
| drawCardBullet / drawCardStatus / drawCardLightning | src/card-vfx.js | 共用元素彈體、敵人狀態及連鎖電擊。 |
| drawCardWorld / drawPixelPhoenix | src/card-vfx.js | 龍與龍息、飛行武器、護符、黑洞、磁力、時停、地裂、爆破與復活。 |
| cardIllustration / revealCard / addCardImpact | src/card-vfx.js | 抽卡插畫、取得提示、限制數量的命中視覺。 |

♻️ 沿用 drawPlayer、drawSpriteWithEyes、fire、swordSwing、shieldBash、daggerStrike、cardEmblem、serializeCoopState、applyCoopState。
🆕 新寫 card-vfx（舊幾何武器與重複模糊光圈無法接到人物全身動作）。

♻️ 沿用 attachTouchToStick、setStick：搖桿開始與移動都讀取目前可見範圍，觸控與滑鼠共用同一方向／縮放算法。#ctl、#rbtns 透明空白區不攔截事件，右側按鍵容器維持靠右；只有實際搖桿與技能按鈕接收點擊。

| getSkillTravelDirection | src/utils.js | 從閃電步／閃避、鬼斬及影襲回歸取得實際位移方向；角色和殘影共用，獨立於瞄準方向。 |

♻️ 沿用 drawCardLightning 還原原版平滑雙層電擊；沿用 drawPlayer、drawPixelMelee、drawPixelGunner 顯示位移方向。🆕 新寫 getSkillTravelDirection（原本角色朝向只由攻擊或上一幀座標推導，位移時可能朝錯方向）。

| generatedArtReady / artFrame / drawArt / artThumbnail / directionIndex | src/generated-art.js | 載入生成圖集，依方向與格次共用繪圖。 |
| bossArtReady / bossName / drawBossArt / drawBossDefeats | src/boss-art.js | Boss、召喚怪、入場與擊敗圖共用。 |
| endingArtReady / drawBossEndingFrame | src/boss-art.js | 同一 Boss 退場與暗城轉晨光的 9.5 秒結尾，遊戲與展示共用。 |
| drawTreasure / animateChestOpening | src/treasure-art.js | 大小寶箱、受擊進度與開箱選卡動作。 |
| drawGhostSlash | src/card-vfx.js | 保存攻擊方向與角色，150 毫秒後重演全身揮劍。 |
| prepare-generated-art.py | scripts/prepare-generated-art.py | 沿用 generate2dsprite 去底和對齊，整理 228 格生成美術。 |

♻️ 沿用 drawPlayer、drawSpriteWithEyes、swordSwing、drawCardWorld、playEndCutscene、drawStageBoss、drawMiniEnemy、showPick、serializeCoopState、applyCoopState。
🆕 新寫 generated-art、boss-art、treasure-art（既有程式形狀與空白 emoji 沒有生成素材圖集或同一 Boss 結尾）。

| drawCardGround / drawCardIcon | src/card-vfx.js | 地面層避免遮擋；側欄沿用實際卡牌素材。 |
| drawAbilitySidebar | src/hud.js | 沿用原 loop 側欄，單人與連線客戶端共用。 |

♻️ 沿用 cardWeaponAtlas、drawSpriteWithEyes、drawArt、drawPlayer；胸甲依逐格 torso 貼合，刺客 hands 分別放單刀。🆕 drawAbilitySidebar（原入口僅在主機迴圈，無法給客戶端共用）。

| recordRoleEffect / drawRoleEvents | src/role-card-art.js | 限量職業卡事件與地面／前景分層。 |
| drawRolePlayerLayer / drawRoleGun / drawRoleBullet | src/role-card-art.js | 裝備、槍口與彈體，避開臉部。 |
| updateBossPattern / clearBossPattern / updateBossHazards | src/boss-patterns.js | 新招、核心、空檔與泥地減速。 |
| drawBossPatternGround / drawBossPatternCore | src/boss-patterns.js | 共用危險預告、核心與反擊提示。 |

♻️ 沿用 swordSwing、shieldBash、daggerStrike、awardEnemyKill、drawCardWorld、drawPixelMelee、drawArt、serializeCoopState、applyCoopState 及原受傷結算。
🆕 新寫 role-card-art（既有元素入口沒有職業條件事件）、boss-patterns（既有 Boss 沒有可中斷核心及分時預告）。drawArt 增加 stretch，解決光束等比例縮短；龍圖與龍息共用 b.ang。

| drawAttachedCardLayer | src/attached-card-art.js | 每格肩背／胸部、方向及前後遮擋。 |
| legendProfile / drawLegendPlayerLayer / drawLegendBullet / drawLegendStrike | src/legend-card-art.js | 三張神兵識別、地面神紋、彈體與斬痕。 |
| drawBossRoute / drawBossPulseGround | src/boss-telegraph-art.js | 裝飾路線、瞬移落點、脈衝與真正安全區遮罩。 |
| queueBossGroundHit | src/boss-patterns.js | 原脈衝與新招共用既有受傷／倒地／復活。 |

♻️ 沿用 drawPixelMelee、drawPixelGunner、drawSpriteWithEyes、cardWeaponAtlas、drawArt、updateBossPattern、serializeCoopState、applyCoopState。
🆕 drawAttachedCardLayer（原外層不知道实际圖片姿勢）、legend-card-art（三卡原共用 fx.star 無辨識）、boss-telegraph-art（原純幾何提示無專用美術）。

| drawMountedArt | src/generated-art.js | 握柄／刀尖兩軸對齊，避免固定偏移角與外框縮放。 |
| weaponStyle / drawRiggedWeapons / gunRigSpec / gunRigPlacement / drawRiggedGun / drawRiggedHands | src/weapon-rig.js | 明確握點、前後遮擋、原手掌覆蓋與一致槍口。 |
| applyIceControl / tickEnemyControl / enemySlowFactor | src/enemy-control.js | 全職業冰系控制、不可刷新與解凍保護、Boss減速。 |
| apply-weapon-mounts.py | scripts/apply-weapon-mounts.py | 重套 docs/weapon-mounts.json 作者資料，圖集重製後仍保留定位。 |

♻️ 沿用 drawSpriteWithEyes、cardWeaponAtlas、drawPixelMelee、drawPixelGunner、getGunnerMuzzle、fire、drawEnemy 與原元素命中入口。
🆕 weapon-rig（原固定45度與亮色推算無法分辨刀尖握柄）、enemy-control（原各職業各自刷新 frozen，無共用限制）、drawMountedArt（drawArt 只有外框尺寸，沒有握柄軸）。

| enemyArtGroup / drawEnemyCreature | src/creature-art.js | 五個普通族群、兩種小王／精英，保留碰撞与AI。 |
| roleEffectOrigin | src/role-card-art.js | 以 owner 最新人物／握點計算跟身特效，不留在發動位置。 |
| weaponPoseFor | src/weapon-rig.js | 取得真正繪製的當格握點與當時擁有者座標。 |

♻️ 沿用 drawEnemy、drawRiggedWeapons、drawArt、recordRoleEffect、drawRoleEvents、drawCardWorld、serializeCoopState、applyCoopState。
🆕 creature-art（原幾何怪身體沒有角色圖片）、roleEffectOrigin（原事件只保存固定座標）、weaponPoseFor（原光束看不到實際繪製握點）。新素材416格46組；劍氣八段，光劍180毫秒，單人與雙人保持同樣位置規則。

| applyBossDamageBudget | src/enemy-control.js | 死亡獎勵與移除前共用每秒傷害預算；先限制再換秒，保護全部真正 Boss。 |
| startEnemyKnockback / updateEnemyKnockback | src/enemy-control.js | 180毫秒快速滑退，抵銷追擊、保留受擊傾斜，Boss較小推力。 |

♻️ 沿用 recordRoleEffect、drawRoleEvents、drawArt、settleEnemyDeaths、awardEnemyKill、updateBossPattern。🆕 共用傷害預算／擊退函式（原秒末回血與直接改座標無法攔住提早死亡／表達受力）。

| resolveExplorationCoin | src/cards-ui.js | 主機唯一擲幣寶箱結算，成功於持有者100～148附近生成可開箱獎勵。 |
| drawShadowClones | src/render.js | 分身獨立雙刀動作，原人物圖的輪廓遮罩及紫色出刀，主機／連線共用。 |
| continueAdventure / confirmAdventureRestart | src/ui.js | 同一頁面保留回首頁的冒險，恢復原選卡或戰場，重新開局前顯示進度取代提醒。 |

♻️ 沿用 drawPlayer、drawPixelMelee、drawArt、animateChestOpening、showPick、resumeGame、原地圖寶箱碰撞與選卡入背包。🆕 上述函式（原擲幣嵌入動畫內、分身繪圖只在loop且共用主角狀態、首頁沒有保留進度入口）。

♻️ 沿用 drawRoleEvents、drawArt、pracCloseOnBlank、resetControls、pracRebuildCards、pracUpdateCardUI、setLoopCharType。地震使用原岩塊金裂風格的去底全向圖；盾擊縮小淡化。練習進出／切職業關閉透明遮罩，切職業真正重算卡片並按專屬／通用分組。未新增匯出函式。

| openRewardChest | src/cards-ui.js | 單次開箱、兩人獨立獎勵，近戰／子彈四入口共用。 |
| resetCoopSession | src/coop.js | 換局清除舊選卡、輸入序號、待確認畫面與排程狀態。 |

♻️ 沿用 showPick、pks、resumeGame、serializeCoopState、applyCoopState、setLoopCoopState 等 setter。🆕 openRewardChest（原四處各自判開箱者並覆寫選卡）、resetCoopSession（原P2模組狀態跨局保留）。_applyP2Card(cardId,offerId)、_handleP2Reroll(idx,offerId) 必須帶當前選卡輪次。showPick新增options.rounds，排隊時保存specificCard與持有者。

| beginCoopRun | src/coop.js | 每次雙人新局／重試都以相同開局確認交換角色；避免SG直接重開只有一人。 |

🆕 beginCoopRun（原握手只寫在第一次選角色入口，重試與SG繞過）。單人新局先移除旧net再銷毀peer；雙人CLIENT再來一次請主機啟動新局，仍按新session確認。

| castRoleUltimate | src/skills.js | 四職業大招命中範圍、人物動作與限量特效；P1/P2同入口。 |

♻️ 沿用 recordRoleEffect、drawRoleEvents、drawArt、queueBossGroundHit、updateBossPattern、settleEnemyDeaths 及角色全身動作。🆕 castRoleUltimate（原全場傷害與P2通用爆炸沒有職業範圍）。

| updateAssassinUltimates | src/skills.js | 主機逐幀處理八段高速位移、沿路命中及每敵人最多三次傷害，P1/P2共用。 |

♻️ 沿用 castRoleUltimate、recordRoleEffect、drawRoleEvents、getDashGhosts、drawPlayer、triggerHuntPressure、drawEnemyCreature。🆕 updateAssassinUltimates（原刺客大招只有一次範圍扣血，沒有真正人物移動）。

| drawHuntWindRoute | src/render.js | 低亮度連貫雙道地面風痕與方向尖端，代替五枚重複風圖。 |

♻️ 沿用 drawEnemy、drawArt、drawRoleEvents、castRoleUltimate 與八閃位移。🆕 drawHuntWindRoute（原逐個貼圖形成不連貫路線）。

| applyCardLevel | src/cards.js | 每張卡本級總貢獻、升級差額與倍率替換，保留其他卡及動態加成。 |
| doP2Ult / castPlayerUltimate | src/skills.js | 與doUlt同一判定、卡片替換、獨立集氣／冷卻。 |
| updateSummonOrbs | src/skills.js | 每位持有者的守護球出擊、傷害與回收。 |
| skillAimDirection | src/skills.js | 技能真正發射當下重新找敵，狙擊從實際槍口瞄準。 |

♻️ 沿用card、doUlt、recordRoleEffect、drawRoleEvents、drawArt、getGunnerMuzzle、drawPlayer、drawShadowClones、continueAdventure、generate2dsprite處理器。🆕 上述共用函式（原升級逐級堆疊、P2通用爆炸、只有P1召喚球、狙擊舊方向）。

♻️ 沿用 drawEnemy 與 drawEnemyCreature：移除小怪獵殺／普通衝刺預告路線，蓄力與衝刺動作沿用。drawHuntWindRoute已移除，前方歷史表列不再為現有函式。

| bindSettingsCardDetails | src/ui.js | 設定卡片450ms長按，滑動10px取消，沿用showCardTip顯示持有等級。 |
| showChaosNotice | src/ui.js | 顯示混沌核心實際增益清單、12秒提示及去重，雙人各自接收。 |

♻️ 沿用 showCardTip、rndBuff、applyCardLevel、drawTitleHero、continueAdventure。🆕 上述函式（設定卡列沒有互動、混沌隨機增益沒有玩家通知）。showCardTip(cid,options={})新增level及charType選項，原練習入口仍列所有等級。rndBuff回傳實際增益文字。
