# Cute RPG Action Shooter — Architecture

## Module Overview

| Module | Purpose |
|--------|---------|
| src/card-vfx.js | Formal pixel card art, cached weapon materials, player attachment layers, projectiles, impacts and world effects. Shared by host/client and practice. |
| `src/main.js` | Entry point and glue code (~350 lines). Owns top-level state (g, _mode, _charType, _net, inv, etc.), wires all modules together via initXxx(deps), implements startGame(), overGoHome(), showCharSelect(), pickChar(), and the data-action event delegation listener. |
| `src/state.js` | Legacy shared state object S — originally intended as a central store; most modules now use their own module-level vars via dependency injection. Still holds dragon-pet sprite references. |
| `src/config.js` | Pure constants: map dimensions, player/enemy radii, cooldown timings, CHAR definitions (gunner/swordsman/tank), MODE definitions (classic/elite/coop/practice), rarity weights/colors, and the pickRole() function. |
| `src/cards.js` | Defines the C array of 52 card objects (each with id, name, emoji, rarity, description, and ap[] level-up functions). Also exports rndBuff() for random stat bonuses. |
| `src/utils.js` | Four pure utility functions: di (distance), cl (clamp), rn (random in range), $ (getElementById). |
| `src/audio.js` | Web Audio API synthesizer for all BGM and SFX. Manages a single AudioContext, plays looping BGM via OscillatorNode chains, and synthesizes game sounds (shoot, hit) procedurally. |
| `src/render.js` | All canvas drawing primitives: drawPlayer(), drawEnemy(), burst() particles, addLtn() lightning, drawPoly(), drawStar(), bCol() element color resolver, WP weapon configs, getWpn(). Owns the par[] particle pool and the fxQ render quality flag. |
| `src/hud.js` | HUD overlay (health bars, XP bar, wave/kill counters, ult charge ring), floating damage numbers (showPlayerDmg), hint queue (showHint), and minimap (drawMinimap). |
| `src/input.js` | Joystick touch tracking, keyboard input (ks object), mouse input, and the skill/ult button. Exports joy/aim state objects, setupInputListeners(), and request flags for coop (getClientUltReq, getClientDodgeReq). |
| `src/enemies.js` | Enemy spawning (spawn()), wave parameters (spawnTargetForWave, spikeConfigForWave), enemy growth curves (enemyGrowth, tierHpFor), crate generation (genCrates, spawnBonusCrates), spike wave and hunt pressure triggers. |
| `src/combat.js` | Bullet firing (fire()), sword swing (swordSwing()), shield bash (shieldBash()), auto-attack dispatch (tapAtk()), nearest-target query (nearestTargets()), kill award (awardEnemyKill()), and death settlement (settleEnemyDeaths()). |
| `src/skills.js` | Character special skills (useCharSkill, skillSnipe, skillGhostSlash, skillTaunt), dash (_startDash), and ultimate (doUlt). Manages skill/ult cooldown state and dash ghost trail. |
| `src/cards-ui.js` | Card pick UI (showPick()), angel card (showAngelCard()), big chest (triggerBigChest()), card inventory helpers (addCard, getCardLv, pks). |
| `src/boss.js` | Stage boss system for Lv20 (poo boss) and Lv30 (devil boss): triggerStageBoss(), updateStageBoss(), drawStageBoss(), checkStageBossDeath(), boss BGM management, boss SFX. |
| `src/coop.js` | PeerJS multiplayer: room creation/joining UI (coopShowCreate, coopJoinRoom, coopStart), host/client sync (serializeCoopState, applyCoopState), client render loop (clientRenderLoop), P2 card pick overlay, coop practice helpers. |
| `src/practice.js` | Practice mode: openPractice(), enemy spawning panel (pracSpawn, pracClear), card selection panel (pracCycleCard, pracRebuildCards), stats panel (pracRefreshStats), HP toggle, coop AI toggle, char switching. bindPracticeToWindow() exposes functions for dynamic innerHTML handlers. |
| `src/ui.js` | Game screens: show(), resize(), settings overlay (openSettings/closeSettings/settingsGoHome), stats panel (toggleStatsPanel), victory screen (showVictoryScreen/triggerVictory), game-over screen (showOver), end cutscene (playEndCutscene), phoenix revive animation. |
| `src/loop.js` | Main game loop (loop() called via requestAnimationFrame). Contains the full ~2400-line update/render tick: enemy AI, bullet physics, collision detection, wave progression, camera (cam()), nearestPlayer(), bothPlayers(), and the serializeCoopState wrapper. |

---

## Module Dependency Graph

```
utils.js        (no imports from project)
config.js       (no imports from project)
cards.js        (no imports from project)
state.js        (no imports from project)

audio.js        → (no project deps beyond browser APIs)

render.js       → utils, config

hud.js          → utils, render

input.js        → (no project deps beyond browser APIs)

enemies.js      → config, utils, render

combat.js       → config, utils, render, audio, enemies, cards-ui, hud

skills.js       → config, utils, render, audio, combat, enemies, hud

cards-ui.js     → config, utils, cards, audio, render, hud

boss.js         → config, utils, render, audio, combat, enemies, skills

coop.js         → config, utils, render, hud, input, cards, cards-ui,
                  enemies, combat, skills, boss, audio, practice

practice.js     → config, utils, cards, audio, render, enemies,
                  cards-ui, boss, combat, skills, coop

ui.js           → config, utils, render, audio, cards, hud

loop.js         → config, utils, render, hud, input, enemies, combat,
                  skills, cards-ui, boss, coop, practice, ui, audio

main.js         → all modules (entry point / glue)
```

---

## Function Index

### utils.js — 純工具函式
- `di(a, b)` — Euclidean distance between two {x,y} objects
- `cl(v, l, h)` — clamp v between l and h
- `rn(a, b)` — random float in [a, b)
- `$(id)` — document.getElementById shorthand

### config.js — 常數、角色、模式定義
- `pickRole()` — randomly pick an enemy role constant

### cards.js — 卡片定義
- `C` — array of 52 card objects (id, n, e, r, desc, ap[])
- `rndBuff(s)` — apply a random stat buff to player object s

### audio.js — BGM + SFX
- `setMuted(v)` / `getMuted()` — mute state
- `bgmPlay()` / `bgmStop()` / `bgmRef()` — background music
- `sfxCtx()` — initialize AudioContext on user gesture
- `getActx()` — return AudioContext
- `sfx(type)` — play named sound effect
- `sfxShoot()` / `sfxHit()` — convenience wrappers
- `toggleMuteState()` — toggle mute and return new state

### render.js — 繪圖函式
- `setCx(c)` / `getCx()` — canvas 2D context
- `setG(game)` / `getG()` — game state reference
- `setFxQ(q)` / `getFxQ()` — FX quality level
- `par` — particle array (accessed via resetPar/filterPar/setPar)
- `resetPar()` / `filterPar(fn)` / `setPar(arr)` — particle pool management
- `resetLtnRingIdx()` — reset lightning ring index
- `burst(x, y, col, n)` — emit n particles at (x,y)
- `addLtn(x1, y1, x2, y2, life)` — add lightning bolt
- `bCol()` — return bullet color set based on player element
- `drawPoly(x, y, r, sides, rot)` — draw regular polygon
- `drawStar(x, y, r, pts, rot)` — draw star shape
- `WP` — weapon config object (ranges, colors by char type)
- `getWpn(fx)` — return weapon config for player's element
- `drawPlayer(x, y, r, t, col, face)` — draw player sprite
- `drawEnemy(e)` — draw enemy sprite

### hud.js — HUD、小地圖、提示
- `initHud(deps)` — wire cam/mapW/mapH/crateActive
- `setHudG(game)` — set game reference
- `setHudCoopState(isCoop, net)` — set coop state
- `setHudSkillCd(v)` / `getHudSkillCd()` — skill cooldown end time
- `setHudAim(a)` — set aim reference
- `setHudVW(v)` / `setHudVH(v)` — viewport size
- `showPlayerDmg(dmg, p)` — show floating damage number
- `hud()` — draw full HUD overlay
- `showHint(text)` — queue a floating hint message
- `drawMinimap()` — draw minimap overlay

### input.js — 搖桿、鍵盤
- `joy` — joystick state {a, dx, dy, id, sx, sy}
- `aim` — aim state {a, dx, dy, id, sx, sy, tn, lt}
- `ks` — keyboard state object
- `initInput(deps)` — wire tapAtk/doUlt/useCharSkill/getG/getNet
- `setupInputListeners()` — attach all event listeners
- `setStick(el, dx, dy)` — move joystick knob visually
- `resetControls()` — reset all input state
- `resetJoyAim()` — reset joy and aim to zero
- `attachTouchToStick(state, zoneId, knobId, touch)` — bind touch to joystick zone
- `rebindActiveTouches()` — rebind after touchstart
- `getClientUltReq()` / `setClientUltReq(v)` — coop ult request flag
- `getClientDodgeReq()` / `setClientDodgeReq(v)` — coop dodge request flag

### enemies.js — 敵人生成、波次
- `initEnemies(deps)` — wire mapW/mapH
- `setEnemiesG(game)` — game reference
- `setEnemiesMode(mode)` / `setEnemiesCoopMode(v)` / `setEnemiesPracticeMode(v)` — mode flags
- `maxTierForWave(w)` — max enemy tier for wave w
- `enemyGrowth(w)` — enemy stat multiplier for wave w
- `tierHpFor(t)` — HP multiplier for tier t
- `pickEnemyTier(w, boss)` — randomly pick enemy tier
- `spawnTargetForWave(w)` — target enemy count for wave w
- `spikeConfigForWave(w)` — spike wave config
- `genCrates()` — generate initial map crates
- `spawnBonusCrates(count)` — spawn bonus crates near player
- `spawn(boss, opts)` — spawn one enemy
- `_coopGenCircles(e)` — generate coop spawn circle positions
- `triggerSpikeWave(w)` — start a spike wave
- `triggerHuntPressure(now)` — trigger hunt pressure mode

### combat.js — 射擊、揮劍、碰撞、擊殺結算
- `initCombat(deps)` — wire showPick/sendP2Pick/mapW/mapH/crateActive/setShake/isElite
- `setCombatG(game)` — game reference
- `setCombatMode(mode)` — mode flag
- `setCombatCoopState(isCoop, net, p2AI)` — coop state
- `setCombatInv(i1, i2)` — inventory references
- `setCombatSkillCd(v)` / `getCombatSkillCd()` — P1 skill CD
- `setCombatP2SkillCd(v)` / `getCombatP2SkillCd()` — P2 skill CD
- `setCombatClientSkillReq(v)` / `getCombatClientSkillReq()` — coop skill request
- `nearestTargets(src, k)` — return k nearest enemies to src
- `awardEnemyKill(e)` — handle XP, drops, score on enemy death
- `settleEnemyDeaths(protectBoss)` — remove dead enemies
- `fire(dmg, dx, dy, sp, p)` — fire a bullet from player p
- `swordSwing(_pp, _isP2)` — sword melee swing arc
- `shieldBash(_pp, _isP2)` — tank shield bash
- `tapAtk()` — auto-attack dispatch (fires fire/swordSwing/shieldBash per char type)

### skills.js — 角色技能、大招、閃避
- `initSkills(deps)` — wire mapW/mapH/setShake/isElite
- `setSkillsG(game)` — game reference
- `setSkillsCoopState(isCoop, net)` — coop state
- `setSkillsClientSkillReq(v)` / `getSkillsClientSkillReq()` — coop skill request
- `getDashGhosts()` / `setDashGhosts(v)` / `resetDashGhosts()` — dash ghost trail
- `SKILL_CDS` — cooldown durations per character type
- `getSkillCdEnd()` / `setSkillCdEnd(v)` — P1 skill cooldown end
- `getP2SkillCdEnd()` / `setP2SkillCdEnd(v)` — P2 skill cooldown end
- `p2UseSkill()` — trigger P2 skill (AI or coop client)
- `useCharSkill()` — trigger P1 skill based on charType
- `skillSnipe(now, _pp, _isP2)` — gunner snipe skill
- `skillGhostSlash(now, _pp, _isP2)` — swordsman ghost slash skill
- `skillTaunt(now, _pp, _isP2)` — tank taunt skill
- `_startDash(now)` — initiate dodge dash
- `doUlt()` — trigger ultimate ability

### cards-ui.js — 卡片選擇 UI
- `initCardsUi(deps)` — wire show/resumeGame/triggerStageBoss/isElite/mapW/mapH
- `setCardsUiG(game)` — game reference
- `setCardsUiInv(i1, i2)` — inventory references
- `getCardLv(id)` — current level of a card in inventory
- `addCard(id)` — add or level up a card in inventory
- `pks(n, excludeIds, useInv, useCharType)` — pick n random card candidates
- `getCurrentPickCtx()` — return current pick context string
- `showAngelCard()` — show angel card offer overlay
- `triggerBigChest(count)` — trigger big chest sequence
- `showPick(src, specificCard, pickCtx)` — show card pick overlay

### boss.js — Stage Boss 系統
- `initBoss(deps)` — wire mapW/mapH/triggerVictory/setShake/setHitFlash
- `setBossG(game)` — game reference
- `setBossCoopMode(v)` — coop flag
- `setBossIsElite(fn)` — elite mode predicate
- `getStageBoss()` / `setStageBoss(v)` — stage boss entity
- `bossBgmStart(bpm)` / `bossBgmStop()` / `bossBgmSetBpm(bpm)` — boss BGM
- `sfxBossEntrance(type)` / `sfxBossAtk(type)` — boss sound effects
- `triggerStageBoss(lv)` — spawn stage boss at level lv (20 or 30)
- `updateStageBoss(e, now, dt)` — per-frame boss AI and attack patterns
- `drawStageBoss(e, now)` — draw boss sprite and health bar
- `drawMiniEnemy(e, now)` — draw small boss-summoned enemy
- `checkStageBossDeath()` — check and handle boss death

### coop.js — PeerJS 連線、狀態同步
- `initCoop(deps)` — wire all main.js state getters/setters
- `setCoopVW(w)` / `setCoopVH(h)` — viewport size for coop render
- `_coopGenCode()` — generate random room code
- `showCoopLobby()` — show coop lobby screen
- `coopShowCreate()` / `coopShowJoin()` — show create/join panel
- `coopCreateCustom()` — create room with custom code
- `coopBack()` — navigate back in coop lobby
- `coopCreateRoom()` — create room with random code
- `_coopDoCreate(code)` — internal room creation with PeerJS
- `coopJoinRoom()` — join room by code
- `coopStart()` — host starts the coop game
- `_coopStartReal(charType)` — internal start after char select
- `_sendP2Pick(cr)` — host sends card pick options to client
- `_handleP2Reroll(idx)` — handle client reroll request
- `_applyP2Card(cardId)` — apply P2's card choice
- `showCoopPick(data)` — show P2 card pick overlay (client side)
- `serializeCoopState(g, cam, par, getDashGhosts, getP2SkillCdEnd, aim, ULT_CHARGE_NEED)` — serialize full game state for network sync
- `applyCoopState(data, g, showOver, setPar, setDashGhosts)` — apply received state on client
- `clientRenderLoop(...)` — client-side render loop (no game logic)
- `pracCoopRoom(opts)` / `pracCoopJoin(opts)` — practice mode coop helpers

### practice.js — 練習模式
- `initPractice(deps)` — wire main.js state getters/setters
- `getPracticeMode()` / `setPracticeMode(v)` — practice mode flag
- `getPracFiniteHp()` / `setPracFiniteHp(v)` — finite HP flag
- `PRAC_ENEMIES` — list of spawnable enemy configs
- `showCardTip(cid)` — show card tooltip overlay
- `pracCloseOnBlank()` — close all practice panels
- `pracTogglePanel(which)` — toggle cards/enemies/stats panel
- `pracRefreshStats()` — refresh stats panel with current values
- `pracCycleCard(cid)` — cycle card level (none→Lv1→Lv2→Lv3→none)
- `pracUpdateCardUI(cid)` — update visual badge for one card
- `pracRebuildCards()` — reapply all selected cards to player
- `pracToggleEnemy(eid, on)` — add/remove enemy from spawn set
- `pracSpawn()` — spawn selected enemies
- `pracClear()` — clear all enemies and bullets
- `pracToggleHp()` — toggle between infinite HP and 200 HP
- `exitPractice()` — exit practice mode and return to title
- `pracSwitchChar()` — cycle player character type
- `pracToggleCoop()` — toggle coop AI mode in practice
- `pracCycleP2Char()` — cycle P2 AI character type
- `pracCoopRoom()` / `pracCoopJoin()` — practice coop room helpers
- `openPractice()` — enter practice mode (called after char select)
- `bindPracticeToWindow()` — expose all practice functions as window.xxx for dynamic HTML onclick handlers

### ui.js — 選單、設定、結果畫面
- `expForLevel(lv)` — XP required for level lv
- `resize()` — recalculate VW/VH based on window/canvas size
- `show(n)` — show named screen overlay
- `resumeGame(cb)` — resume game from settings/pause
- `resetSessionUi()` — reset per-session UI state
- `sfxVictory()` — play victory fanfare
- `playEndCutscene(onComplete)` — play end-game video/animation
- `showVictoryScreen()` — show victory overlay with stats
- `triggerVictory(bossE)` — trigger victory sequence
- `showOver()` — show game-over screen
- `openSettings()` / `closeSettings()` / `settingsGoHome()` — settings overlay
- `toggleStatsPanel()` — show/hide stats panel
- `drawPhoenixSprite(ctx, cx2, cy2, size, time, flapPhase)` — draw phoenix sprite
- `triggerPhoenixRevive()` — start phoenix revive animation
- `phoenixAnimLoop()` — per-frame phoenix animation update
- `getPhoenixAnim()` / `setPhoenixAnim(v)` — phoenix animation state
- `getPhoenixT()` / `setPhoenixT(v)` — phoenix animation timer
- `initUi(deps)` — wire all main.js state getters/setters

### loop.js — 主遊戲迴圈
- `initLoop(deps)` — wire all module state via getter functions
- `syncLoopState(deps)` — direct assignment for startGame refresh
- `getRaf()` / `setRaf(v)` — requestAnimationFrame handle
- `getCTimer()` / `setCTimer(v)` — coop sync interval handle
- `setLoopShake(t, p)` — trigger camera shake
- `setLoopHitFlash(v)` — set hit flash intensity
- `setLoopMode(v)` / `setLoopCharType(v)` — mode/char flags
- `setLoopCoopState(isCoop, net, p2ai, p2input)` — coop state
- `setLoopVWVH(vw, vh)` — viewport size
- `setLoopG(gg)` — game state reference
- `setLoopCanvas(newCx, newFxctx, newFxc)` — canvas references
- `cam()` — compute camera offset {x, y} based on player position
- `nearestPlayer(e)` — return whichever player is closer to enemy e
- `bothPlayers()` — return [g.p] or [g.p, g.p2] in coop
- `loop()` — main game loop tick (requestAnimationFrame callback)

### main.js — 進入點 + 膠水碼
- `startGame(mode)` — initialize and start a game session
- `showCharSelect(mode)` — show character selection overlay
- `pickChar(charType)` — handle character selection
- `overGoHome()` (window) — return to title from game-over/victory
- `window.SG` / `window.startGame` — global aliases for dynamic HTML onclick

---

## Shared State (state.js)

> Note: Most modules use their own module-level variables injected via `initXxx(deps)`. The `S` object in state.js is a legacy holdover; only the dragon sprite fields are still actively used from it.

| Field | Purpose |
|-------|---------|
| `S._dpWingImg` / `S._dpBodyImg` | Dragon pet wing/body Image objects (base64 PNG) |
| `S._dpW/H/JX/JY` | Dragon pet dimensions and joint offsets |
| `S.VW` / `S.VH` | Viewport width/height (initial values) |
| `S._mode` | Current game mode |
| `S._charType` | Current character type |
| `S.CID` | Card ID counter |
| `S.fxQ` | FX quality level |
| `S.par` | Particle pool (legacy; render.js uses its own) |
| `S.g` | Game state object (legacy; modules use injected getters) |
| `S.joy` / `S.aim` | Input state (legacy; input.js uses its own) |

---

## Game Flow

```
Title Screen
    │
    ├─[Classic/Elite]──→ Character Select ──→ startGame(mode)
    │                                              │
    ├─[Coop]──────────→ Coop Lobby ──────────────→ coopStart()
    │                    (create/join room)         │
    └─[Practice]──────→ Character Select ──→ openPractice()
                                                   │
                                    ┌──────────────┘
                                    ↓
                              Game Loop (loop.js)
                                    │
                          ┌─────────┼─────────┐
                          ↓         ↓         ↓
                      Wave ++    Boss!      Card Pick
                    (enemies.js) (boss.js) (cards-ui.js)
                          │         │
                          └────┬────┘
                               ↓
                    Level 20: Stage Boss (💩)
                    Level 30: Stage Boss (😈)
                               │
                          Boss defeated
                               ↓
                        triggerVictory()
                               │
                        ┌──────┴──────┐
                        ↓             ↓
                   playEndCutscene  showVictoryScreen
                        └──────┬──────┘
                               ↓
                        Return to Title

  Game Over (player HP ≤ 0):
    showOver() → overGoHome() → Title
```

---

## Common Modification Guide

- **想改卡片效果？** → 改 `src/cards.js` 中對應卡片的 `ap[]` 陣列（三個等級的函式）
- **想加新卡片？** → 在 `src/cards.js` 的 `C.push(...)` 區段新增卡片物件
- **想改職業推薦卡片？** → 改 `src/config.js:72` 的 `RECOMMENDED` 物件，每個職業是一個 `Set`，內容是卡片名稱（字串）。選卡 UI 會自動顯示 ⭐推薦 標籤。目前清單：
  - 🛡️ tank: 大地震擊、鋼鐵意志、堅韌心、生命果、石膚術、荊棘之盾
  - 🔫 gunner: 無盡之刃、分裂彈、鐵壁金身、創世神力、萬物吞噬、影分身
  - ⚔️ swordsman: 鐵壁金身、天使之翼、毀滅之手、劍氣強化、拔刀術、萬物吞噬、創世神力、達摩的光劍
- **想改敵人行為？** → 改 `src/enemies.js`（生成/波次）和 `src/loop.js`（AI 移動邏輯）
- **想改 Boss 模式？** → 改 `src/boss.js` 的 `updateStageBoss()` 函式
- **想加新角色？** → 改 `src/config.js` 的 `CHAR` 物件 + `src/skills.js`（技能邏輯）+ `src/render.js`（繪圖）
- **想改音效？** → 改 `src/audio.js` 的 `sfx()` 函式或 BGM 合成器
- **想改 HUD 顯示？** → 改 `src/hud.js` 的 `hud()` 函式
- **想改設定畫面？** → 改 `src/ui.js` 的 `openSettings()`
- **想改多人連線邏輯？** → 改 `src/coop.js`
- **想改練習模式？** → 改 `src/practice.js`
- **想改遊戲主迴圈節奏？** → 改 `src/loop.js` 的 `loop()` 函式

## Pixel gunner appearance

- `src/gunner-sprite.js` loads the generated eight-direction atlas and exports `gunnerSpriteReady`, `getGunnerPose`, `getGunnerMuzzle`, `drawPixelGunner`. It depends only on browser APIs. `render.js` and `combat.js` import it.
- `drawPlayer(x,y,r,t,col,face,playerState)` retains the existing entry point; optional `playerState` selects P2 aim and shot timing.
- `assets/gunner-pixel.png` and `assets/gunner-pixel.json` are served from Vite publicDir and copied to dist.
- `角色預覽/gunner-pixel-preview.html` checks eight distinct directions using the actual renderer and displays recoil on demand.
- Gameplay damage, movement speed, collision radius and other class appearances stay as configured. Gunner bullets and particles use the atlas muzzle coordinate. Co-op state includes aim and elapsed shot timing.
- One static body pose per direction; no authored walk animation yet.

## 正式遊戲版人物與介面

新增模組與依賴：main.js → button-art.js；cards-ui.js / practice.js / ui.js / hud.js → button-art.js；render.js → melee-sprite.js。

- button-art.js 匯出 pixelEmblem、cardEmblem、setActionEmblem、installGameButtons。沿用既有按鈕事件與卡片資料，建立職業徽章、像素人物肖像、技能標示與卡片效果徽章。
- melee-sprite.js 匯出 meleeSpritesReady、swordActionsReady、drawPixelMelee。載入 melee-pixel.png/json 與 swordsman-action.png/json。
- drawPlayer 新增可選第八參數 renderOptions；aiming:true 僅供方向展示。未攻擊槍手面向正面，近戰移動時轉向移動方向，停止後回正面。
- 劍士全身四階段姿勢：提劍、跨步橫斬、收勢、架式。盾與短刀以手部錨點連續推進、回收。attack angle 隨攻擊動畫同步至連線客戶端。
- 此輪沿用原命中範圍與傷害結算時機；全身劍術目前四張關鍵姿勢，尚非大量逐格步行動畫。
- 角色預覽/正式遊戲版-人物與招式.html 是手動展示頁，不執行自動測試。依使用者要求，本輪未執行 build 或瀏覽器功能測試。

## 眼睛、雙刀、盾牌與全介面圖案更新

- melee-sprite.js 新增 export assassinActionsReady、tankShieldReady。同模組載入 assassin-action.png/json（96×96 格、8方向×4階段）與 tank-shield.png（64×64 格、8方向）；既有 drawPixelMelee 沿用全身姿勢流程，雙刀隱身仍尊重玩家技能狀態。
- 坦克盾牌始終直立，藉八方向圖呈現正面、斜面、侧面和背面；手部錨點與盾擊推進仍沿用。
- index.html 的 settingsOv 改成冒險手冊，保留原事件與 sfxToggle、sfxKnob、settingsStats 識別碼。ui.js 沿用角色能力与背包資料，重排卡片列和能力列。
- 首頁、職業、戰鬥控制、設定、卡片選擇／說明／背包、連線、練習、提示、勝敗介面全部巡查表情符號。卡片資料的舊 emoji 欄位清空，技能標示改文字，UI 用 button-art.js 共用像素圖案。歷史備份不修改。
- hud.js 的大招就緒文字移除向下箭頭。
- 使用者負責測試與驗證；本輪未跑 build、verify 或遊戲操作測試。

- button-art.js 新增 export createRolePortrait，供 installGameButtons 以原生像素繪製選角頭像。依透明度計算可見範圍，再置中至 48×56 畫布。武器徽章移至職業名稱旁。

## 固定眼睛繪製

- 模組總覽：`src/sprite-eyes.js` 保存四張圖集每格舊眼睛座標與共用眼睛繪製函式。
- 模組依賴：`gunner-sprite.js`、`melee-sprite.js`、`button-art.js` → `sprite-eyes.js`。
- 函式索引：`drawSpriteWithEyes(ctx,image,key,sx,sy,cell,dx,dy,size)` 先繪角色，再以附近膚色遮掉原眼睛，依固定 2×2 原生格繪眼睛；輸出寬高取同一整數值，雙眼高度一致。
- 圖片本身不改動；獨立直接顯示 PNG 的工具仍會看到原眼睛。遊戲與正式人物展示頁走共用繪製。

## 裝置版面編輯

- 模組總覽：`src/control-layout.js` 為裝置專屬的版面編輯與持久儲存；純前端，不上傳配置。
- 模組依賴：main → control-layout；ui → control-layout；control-layout 透過注入 resize、resetControls 和 openSettings 串接原流程，避免循環相依。
- 函式索引：`initControlLayout(deps)` 安裝工具、項目與事件；`openLayoutEditor()` 開啟；`getLayoutViewport(rect)` 計算畫面位置與寬高；`applyControlLayout()` 套用位置與縮放。
- 設定入口：手機按鍵與畫面配置。直式／橫式分開存於 localStorage 的 cute-rpg-layout-v1。拖曳移動、兩指縮放、滑桿微調；支援儲存、取消、單項還原與整體還原。
- 可調項目：遊戲畫面（寬、高、位置）、搖桿、攻擊、技能、閃避、大招、小地圖、各狀態列、設定鍵、提示與各練習工具按鈕／面板。
- input 以顯示後的搖桿半徑計算力度，搖桿內球仍用原生尺寸計算位移；重綁觸控依真正按鍵位置判定。編輯時清除控制與鍵盤狀態。
- ui.resize 同步本機、HUD、連線及 loop 的畫面尺寸。縮小畫面空出的部分為黑邊，可放虛擬控制。

## 卡片特效模組依賴與函式索引（2026-10-12）

```mermaid
graph LR
 render --> card_vfx[card-vfx.js]
 melee_sprite --> card_vfx
 gunner_sprite --> card_vfx
 loop --> card_vfx
 coop --> card_vfx
 combat --> card_vfx
 ui --> card_vfx
 skills --> card_vfx
 practice --> card_vfx
 cards_ui --> card_vfx
 button_art --> card_vfx
```

skills 只記錄時停的視覺期限，未改傷害或凍結機制。card-vfx 不匯入遊戲狀態；透過參數取得資料。

函式索引：CARD_PALETTES、drawPixelPhoenix、drawCardPlayerLayer、cardWeaponAtlas、drawCardGun、drawCardBullet、drawCardStatus、drawCardLightning、drawCardWorld、revealCard、drawCardStrike、cardIllustration、addCardImpact，均在 src/card-vfx.js。逐卡呈現方式見 docs/卡片特效改版清單.md。

## 位移朝向與待審美術（2026-10-12）

函式索引：src/utils.js 新增 getSkillTravelDirection(player,now)，供 src/render.js 取得技能位移朝向。優先使用閃避／閃電步向量、鬼斬起終點、影襲回程向量；殘影記錄自己的方向與職業。雙人同步使用剩餘時間，避免不同裝置的時鐘造成朝向錯亂。drawCardLightning 保留同名入口，內容恢復原版平滑雙線折電。

美術新稿在角色預覽/卡牌特效預覽-待確認.html；圖檔來源與各表格尺寸在角色預覽/card-effects-review-manifest.json。待 Dino 看圖確認後才接入 assets 或發布；這批生成圖未取代現役素材。

## 生成卡牌、Boss、殘影斬與寶箱（2026-10-12）

模組總覽：
- src/generated-art.js：圖集載入、逐格繪圖與縮圖。assets/generated-art.png/json 共 24 組、228 格；原稿由內建 image_gen 生成。
- src/boss-art.js：八方向 Boss、攻擊、召喚怪與六格擊敗動作；暗城／晨光兩張生成場景。純繪圖。
- src/treasure-art.js：大小寶箱與四階段開箱；地圖與選卡彈窗共用。
- src/art-preview.js / art-preview.html：獨立手動美術展示，不啟動主遊戲邏輯。Vite 同時打包遊戲與展示頁。
- scripts/prepare-generated-art.py：沿用 generate2dsprite 去底／分格／對齊後打包。來源在 docs/generated-art-sources.json。

依賴圖：
```mermaid
graph LR
 card_vfx[card-vfx.js] --> generated_art[generated-art.js]
 boss[boss.js] --> boss_art[boss-art.js]
 boss_art --> generated_art
 ui[ui.js] --> boss_art
 ui --> melee_sprite[melee-sprite.js]
 ui --> gunner_sprite[gunner-sprite.js]
 treasure_art[treasure-art.js] --> generated_art
 loop[loop.js] --> treasure_art
 loop --> boss_art
 coop[coop.js] --> treasure_art
 coop --> boss_art
 coop --> ui
 cards_ui[cards-ui.js] --> treasure_art
 preview[art-preview.js] --> card_vfx
 preview --> boss_art
 preview --> treasure_art
```

函式索引：
- generated-art.js：generatedArtReady、artFrame、drawArt、artThumbnail、directionIndex。
- boss-art.js：bossArtReady、bossName、drawBossArt、drawBossDefeats、endingArtReady、drawBossEndingFrame。
- treasure-art.js：drawTreasure、animateChestOpening。
- card-vfx.js：新增 drawGhostSlash；原有匯出介面保留，改用生成圖。drawCardLightning 保留平滑雙線電擊。cardWeaponAtlas 保護臉部／身體，替換武器金屬區並快取；drawCardGun 使用槍口位置。
- ui.js：playEndCutscene 保留完成回呼，改即時畫布；9.5 秒後完成。「跳過動畫」／Escape／Enter 可略過，事件與動畫迴圈清理一次。g._finalBoss 記錄 type、phase。
- coop.js：同步殘影方向與相對時間、Boss 攻擊／護盾剩餘時間、迷你怪旗標、擊敗圖、龍週期與通關資料；客戶端通關只觸發一次。
- combat.js：殘影斬保存角色方向與卡牌外觀，移除環狀粒子。原 150 毫秒傷害延遲、比例與扇形範圍沿用。
- cards.js：連弩加純外觀旗標 _crossbow，攻速數值不改。
- loop.js / coop.js：大小寶箱共用圖片；showPick / showCoopPick：四階段開箱動作。

此批生成圖經「實裝上去看看」授權，取代上一節待審狀態。殘影斬、寶箱、Boss 和結尾同次更新。使用者自行進行遊戲測試；只執行發布必要打包。

## 2026-10-12 遮擋、装備與辨識修正

- ♻️ 沿用 drawCardWorld / drawPlayer；新增 drawCardGround 在人物之前繪黑洞、磁力場與時停，前景不重繪。黑洞固定於地面的扁橢圓內旋轉，角色保持可見。
- ♻️ 沿用 cardWeaponAtlas、drawSpriteWithEyes；鐵壁金身不再把整張護甲圖覆蓋角色。使用生成的八方向 fitted-armor，四職業逐格 torso 位置與尺度貼合胸口，保留原皮膚、臉與手。
- 刺客八方向 × 四動作共 32 格記錄兩隻手的 x/y/angle。dagger-single 從已核准的成對武器圖提取一把完整短刀，再於每隻手獨立繪製。
- 🆕 drawAbilitySidebar（原右側欄只存在 loop，客戶端沒有共用入口）：將原欄位繪圖搬入 hud.js；使用 drawCardIcon 畫卡牌素材，移除空 emoji 來源。雙人同步 P2 背包，客戶端使用同一入口。
- 地圖寶箱不再按整格透明留白縮小；可見箱體小寶箱 42、大寶箱 58 畫布單位，進度條置於下方。
- 污泥小怪可見本體 34、狂暴小怪 29 畫布單位，亮輪廓、略提亮與 110 毫秒受擊閃白；輪廓版本快取，雙人同步閃白剩餘時間。
- 圖集更新 244 格、26 組、1024×3968。新原稿：角色預覽/fitted-armor-source.png。
- 生成圖與四套位置資料 URL 使用 ART_REVISION，避免發布後快取舊版裝備。
- 展示頁可選鐵壁金身與黑洞，再切職業和方向；不操作遊戲測試。

新增匯出索引：card-vfx.js → drawCardGround、drawCardIcon；hud.js → drawAbilitySidebar；generated-art.js → ART_REVISION。
新增依賴：hud.js → card-vfx.js / cards.js；gunner-sprite.js / melee-sprite.js → generated-art.js。

## 2026-10-12 職業卡可見效果、Boss 招式與龍息朝向

模組總覽與函式索引：
- src/role-card-art.js：recordRoleEffect、drawRoleEvents、drawRolePlayerLayer、drawRoleGun、drawRoleBullet。最多 16 筆事件，按原射擊、劍氣、盾擊、暴擊、施毒、擊殺與防禦條件繪製，不改卡牌數值。
- src/boss-patterns.js：updateBossPattern、clearBossPattern、updateBossHazards、drawBossPatternGround、drawBossPatternCore。固定交替新招式、預告、可破壞核心、泥地減速及反擊空檔；繪圖不執行傷害。

依賴圖：
```mermaid
graph LR
 combat --> role_card_art[role-card-art.js]
 card_vfx[card-vfx.js] --> role_card_art
 role_card_art --> generated_art[generated-art.js]
 boss --> boss_patterns[boss-patterns.js]
 loop --> boss_patterns
 render --> boss_patterns
 coop --> boss_patterns
 boss_patterns --> generated_art
 preview[art-preview.js] --> role_card_art
```

- cards.js 保留 ap 數值，套用時記錄 _roleCards 等級。practice.js 重建前清除旗標；coop.js 同步旗標、限量事件、核心、預告與相對時間。
- 達摩光劍沿用 200 範圍、三道原傷害線，改用水平生成光束並 stretch 繪製。劍氣按原 360 度命中呈現八道外擴月牙與人物旋身；拔刀術使用白紅快斬弧。
- drawArt 新增 stretch 選項，其他圖片保持等比例。图集 29 組、256 格、1024×4096。
- 無自動目標時攻擊向下，保留手動瞄準。getGunnerPose 預設亦向下。
- 龍息開啟時圖片方向、嘴部起點與火焰共用 b.ang；無龍息時依實際移動方向飛行，保留振翅。
- 污泥王交替泥雨／重拳；惡魔交替張翼衝刺／十字裂界。預告 1.3～1.9 秒，範圍固定、不追著玩家改線。新招期間停止原攻擊、清理原敵彈；原有 Boss 血量不改。
- 泥雨／裂界各兩顆核心，破壞任一顆中斷並反擊 3 秒。核心無接觸傷害、無經驗或擊殺獎勵；死亡與換階段清理。
- 新招基礎傷害最多 26，沿用原受傷／減傷／閃避／護盾／倒地與復活；地面命中不當作可彈開子彈。命中後 700 毫秒保護，避免同招重複傷害。
- 泥地 3.5 秒，移速乘 .65，不持續扣血。重拳落空後反擊 3 秒、命中後 1.8 秒；其他新招後 2.6 秒。新招及反擊期間無 Boss 接觸傷害。
- art-preview.html 可選全部 17 張職業卡，手動看外觀與觸發示意；主遊戲依既有條件。使用者自行測試，只執行發布必要 npm run build。

## 2026-10-12 附著裝備、神兵與 Boss 預告

模組總覽／匯出函式索引：
- attached-card-art.js：drawAttachedCardLayer。由四職業圖片入口在真正逐格 torso、方向、後座、推進及傾斜的位置呼叫。天使之翼八方向32格，背向局部前層；尊重 effects:false 分身選項。
- legend-card-art.js：legendProfile、drawLegendPlayerLayer、drawLegendBullet、drawLegendStrike。三張神兵分開識別，原 stats 不變。
- boss-telegraph-art.js：drawBossRoute、drawBossPulseGround。新招／原衝刺／瞬移／黑暗脈衝共用生成地面美術。
- boss-patterns.js：新增 queueBossGroundHit。新招及原脈衝共用角色受傷、倒地與復活入口；_absoluteBossDamage 保留原脈衝公式及命中規則。

依賴圖：
```mermaid
graph LR
 melee_sprite[melee-sprite.js] --> attached_card_art[attached-card-art.js]
 gunner_sprite[gunner-sprite.js] --> attached_card_art
 attached_card_art --> generated_art[generated-art.js]
 card_vfx[card-vfx.js] --> legend_card_art[legend-card-art.js]
 legend_card_art --> generated_art
 boss_patterns[boss-patterns.js] --> boss_telegraph_art[boss-telegraph-art.js]
 boss_telegraph_art --> generated_art
 preview[art-preview.js] --> boss_patterns
```

新增來源9組，圖集380格38組、1024×6144；ART_REVISION=attached-epic-boss-20261012-v4。來源肩根 roots 保留固定軸，不用翅膀外框置中。詳細盘點與實作規則見 docs/附著與Boss視覺改版.md。

無目標朝向規則已由固定向下改為最後移動面向；loop 記錄 _moveDir，近戰 idle 保留 model.angle，槍手 idle 用 _moveDir。新角色初始向下、手動瞄準與敵人優先。

X 改成旋轉／鎖定／直線飛出，蓄力可破核心。新招 busy 判斷包含 _teleExe、_chargeEnd、_dashChargeEnd，避免預告瞬移後被中斷。聯機同步鎖定時間、瞬移落點／剩餘時間、衝刺角度／剩餘時間、各神兵旗標。原瞬移、pulse 純幾何預告移除，改地面共享繪圖。

## 2026-10-12 武器定位、冰凍與幾何怪

模組總覽與匯出函式：
- weapon-rig.js：weaponStyle、drawRiggedWeapons、gunRigSpec、gunRigPlacement、drawRiggedGun、drawRiggedHands。原素材握柄／刀尖軸與人物每格握點／刀尖軸直接對齊，替代「找亮色像素、猜最近手部、固定加45度」。前後分層與原生手掌遮擋；武器資料在 docs/weapon-mounts.json，可經 scripts/apply-weapon-mounts.py 重套。
- generated-art.js：新增 drawMountedArt。按兩點計算軸向旋轉及共用比例，保留來源握柄，不以外框置中。
- enemy-control.js：applyIceControl、tickEnemyControl、enemySlowFactor。四職業共用短冰凍、解凍保護、Boss 冰系減速；磁力使用 _magSlowT，不混入 frozen。
- 槍口使用 gunRigPlacement.muzzle；native gun、fire 與展示頁同一座標。盾牌只改原素材色階，八方向輪廓與本體留存。
- 原逐格臉部／眼睛沿用 drawSpriteWithEyes；遮罩只清除已記錄武器區域，並保留皮膚與身體；新武器後重繪來源手掌。素材未就緒時沿用原圖，不快取缺失的胸甲。
- 一般冰凍最多400毫秒，1900毫秒锁定自施加起算＝凍400＋解凍後1500不可再凍；不可刷新。冰系普通移速倍率 .7/.6/.5，Boss／精英 .7。經典普通怪可短凍；精英／雙人維持原本冰系不定身規則。時間停止的 frozen 入口不修改。
- 卡片文字與 slow 值已對齐，原冰脆比例保留。磁力减速 .6，不再定身。
- 几何怪保留圓、三角、菱形、五角、星形，移除漸層等級光暈／圓形高光，改深色外框、平面切面與等大像素眼；仍保留原色、角色标記与血條。
- art-preview.html 新增幾何怪比較；八方向與攻擊示意使用相同武器定位。不操作遊戲測試，由 Dino 驗證。

依賴：
```mermaid
graph LR
 card_vfx[card-vfx.js] --> weapon_rig[weapon-rig.js]
 melee_sprite[melee-sprite.js] --> weapon_rig
 gunner_sprite[gunner-sprite.js] --> weapon_rig
 weapon_rig --> generated_art[generated-art.js]
 weapon_rig --> legend_card_art[legend-card-art.js]
 combat --> enemy_control[enemy-control.js]
 loop --> enemy_control
 boss --> enemy_control
```

槍支左向（西／西北／西南）先鏡射垂直素材軸，再套朝向，保持握把朝下；槍口以同一鏡射推算，避免直接轉180度把槍拿倒。

## 2026-10-12 跟身斬擊、新版劍氣與怪物族群

- src/creature-art.js 新模組：enemyArtGroup、drawEnemyCreature。drawEnemy 先使用生成圖片，素材未就緒才沿用幾何備援。單人、主機、客戶端、練習與展示共用。
- 普通怪五族：mob-jelly 圓形軟糖、mob-fang 三角尖牙、mob-crystal 菱形晶體、mob-bastion 五角石甲、mob-spinner 星形刺輪。射手／衝刺／護盾／包抄以行為對應族群；普通角色按 tier 保留原五種輪廓升階。各族四格呼吸／踏步動作。
- 小王與精英使用 miniboss-armor 青金重甲盾冠、miniboss-tough 赤晶雙角。bossType/role 選造型，沿用原血量、碰撞半徑與 AI。mega 保留大小並加腳下王紋。原兩個最終 Boss 與召喚怪素材沿用。
- generated-art.js fullCell 支援 anchorX/anchorY，怪物在真正腳底112/128定位，四格動作維持尺度；新增416格46組、1024×6656。生成原稿与 brief 在 docs/generated-art-sources.json，處理仍僅去底／分格／對齊。
- weapon-rig.js 新增 weaponPoseFor，從實際人物當格握點取得出光位置。drawRiggedWeapons 在兩層繪圖時記錄手部位置與擁有者當下座標，無世界位置猜測。
- role-card-art.js 新增 roleEffectOrigin。事件記錄 owner/follow/ox/oy/bindHand，單人與雙人都以擁有者最新座標計算。不序列化人物物件引用。
- 光劍：180毫秒，每位玩家只保留最新三道，出光點跟著目前握點；原三道200範圍與傷害不變。
- 劍氣：sword-qi-v2 八格白金青藍利刃；400毫秒聚氣／三刃旋斬／八向釋放。旋轉角度依同一320毫秒全身動作計算。中間留白，保留原360度傷害與卡牌數值。
- 高攻速下同擁有者的新劍氣、拔刀、盾擊波會取代舊跟身斬擊，避免叠加滯後的姿勢；兩位玩家分別處理。
- 聯機同步光劍擁有者、握點選項與生命周期，最多各三道；roleEffects 已以相對時間與 owner 同步。
- 展示頁新增「移動中展示」，由使用者手動啟動；同頁有五族普通怪與兩種小王的實際圖片。

跟隨掃描结果：
| 效果 | 位置規則 |
|---|---|
| 光劍 | 跟隨擁有者的真正握點，短促出光。 |
| 劍氣、拔刀、盾擊短波 | 跟隨人物，角度保留該次攻擊方向。 |
| 暗影、擊殺徽記、音速閃避、鋼鐵意志啟動 | 跟隨擁有者及原偏移。 |
| 一般元素斬、神兵斬、羽翼、胸甲、武器、槍口 | 原已使用當下人物／逐格手部位置，沿用。 |
| 地震裂地、爆點、敵人中毒／暴擊 | 保留實際地面或命中位置。 |
| 殘影、閃電步／鬼斬足跡 | 保留留影位置；它們代表已經经过的位置。 |
| 子彈、迴力鏢、風刃、召喚物 | 沿用自身位置，已射出後不回貼人物。 |
| 雷擊鏈 | 平滑折電沿用，不改成像素電擊。 |

依賴：
```mermaid
graph LR
 render --> creature_art[creature-art.js]
 creature_art --> generated_art[generated-art.js]
 creature_art --> config
 role_card_art[role-card-art.js] --> weapon_rig[weapon-rig.js]
 card_vfx[card-vfx.js] --> role_card_art
```

使用者自行驗證；未操作遊戲測試，只執行發布必要建置。

## 2026-10-12 坦克衝擊、泥雨與 Boss 耐久

- enemy-control.js 新增 export applyBossDamageBudget、startEnemyKnockback、updateEnemyKnockback。combat／loop 共用，依賴不變。傷害預算在獎勵、死亡移除前處理；先套舊窗口限制再記新秒血量，生成即記初始血量，練習 Boss 套階段後再記。原每秒末第一次才記傷後血量的漏洞移除。
- 真正 Boss 排除召喚怪、不可破壞泥怪與核心；經典小王8秒／大型14秒、泥王45秒／最終65秒為滿傷害預算所需時間，天使與破甲加成仍可加速，破甲預算加成最多1.5倍。精英／雙人沿用原15／30／150／240秒。傷害低時仍可能更久，未提高敵人攻擊傷害。經典大型小王原血量倍率1.1改2。
- 經典接觸消失只適用普通怪；Boss、大型小王與精英保留實際血量。坦克盾擊與地震改180毫秒快速滑退，取消原800毫秒自行後退，受擊短傾斜／躍起與方向性風痕。Stage Boss 不位移，小王推力40%。聯機以相對時間同步受擊姿勢。
- 地震只命中210／240／270半徑內（原無距離判定），事件range與真正判定一致；盾擊外圈沿用range+40。全向白金／青綠衝擊前緣，生成刀光與地裂沿20個方向放射，中心留空、固定原發動地面，無底座圖。
- 汙泥王泥雨六顆內圈／十顆外圈，半徑95／195，泥地半徑33／38，保留1.2弧度逃生缺口，地圖邊緣重疊落點去重。落地只緩速不傷害，持續5秒，最多32顆；預告／可中斷核心與.65移速沿用。
- 使用者自行遊玩測試；僅執行發布必要建置。

## 2026-10-12 探索硬幣、影分身與返回首頁

- cards-ui.js 新增 resolveExplorationCoin(player,win)，每次擲幣唯一結算，仍50%成功。成功直接加入g.crates，使用CRATE_HP、needed6、unlockLv1及正常三選一流程，不是只顯示成功字樣。寶箱離持有者100～148，優先避開現有寶箱，世界邊界夾限。showCoinFlip用coin-adventure寶箱／靴子兩面，單調累積角度與真實經過時間減速落定，成功面與判定一致；重複點擊不重算，換局則取消舊動畫與回呼。成功畫面說明需擊破，不直接入背包。
- coop.js → cards-ui.js 新增依賴：P2卡牌效果後由主機結算_coinFlip並送coinResult；客戶端只顯示不再生成寶箱、不暫停整局，顯示期間4.5秒受傷保護。大寶箱／命運後續保留原選卡持有者。練習重建其他卡片不再反覆擲探索靴；擲幣寶箱可由練習子彈開啟。
- 圖集420格47組，新增coin-adventure 2×2雙面金幣及斜面，原稿角色預覽/coin-flip-source.png；由內建image_gen生成，generate2dsprite整理。
- render.js 新增drawShadowClones(now,r)：完整人物尺寸、82%可見度，四邊1.5單位淺紫輪廓，腳下印記，220毫秒現身、最後700毫秒淡出。分身獨立_ad／_attackAt，不繼承主角隱身／攻击狀態；出刀兩道紫刃，傷害頻率和壽命不變。coop同步分身與相對出刀／出生時間，共用畫面函式。
- ui.js 新增continueAdventure、confirmAdventureRestart。settingsGoHome直接暫停並標_homeSuspended，首頁新增「繼續冒險・Lv」。沿用同一個g和背包，不重新startGame；有未選完卡片回原pick，否則resumeGame。首頁新角色／startGame在尚有冒險時提醒取代角色、卡片與關卡，先提供繼續原冒險。此功能保留同一網頁的遊戲，未新增重新整理後的磁碟存檔。
- 使用者自行遊玩測試；本次僅檢閱程式流程及發布打包，未進行遊戲操作／自動測試。

## 2026-10-12 地震去底與練習操作／分類修正

- drawRoleEvents 沿用共用入口。普通shieldwave由360改220毫秒，只有1.2厚度、26%透明青綠細前緣；knockhit改140毫秒、20×9風痕、32%可見度，移除守護圖疊加。只改外觀，擊退距離、時程、命中範圍與傷害沿用。
- quake-radial由原guardian第8格透過內建image_gen編輯，保留深色岩塊與金色裂紋，移除底座／地面平台，改俯視360度及透明中心。地震使用一張此圖從45%擴張至真正判定直徑，700毫秒；移除前版粗雙圈、20道劍氣與重複地裂。圖集421格48組，ART_REVISION=radial-earth-practice-20261012-v8。
- pracSwitchChar原本只改少數屬性及重建卡片DOM，未呼叫pracRebuildCards，角色與卡片／動作不同步。現在關閉所有練習面板與pracBackdrop、重設觸控／鍵盤、技能冷卻、攻擊／閃避／影襲／殘影，設定g.charType與g.p.charType，重算卡片。main同步setLoopCharType。
- exitPractice與openPractice都關閉pracBackdrop及cardTip，避免退出時留下整頁透明攔截層，新練習仍攔截所有搖桿／攻擊按鍵。保留裝置位置配置。
- pracRebuildCards只套用通用或當前charReq專屬卡，保留其他職業選卡記錄而暫停效果；重建不觸發擲幣。練習卡片目前職業專屬在前、通用在後；標出分類名稱及數量，DOM重建後讀回所選卡片等級。
- 依使用者要求未跑遊玩／操作測試；只做發布打包。

## 2026-10-12 雙人通關連線與獎勵修正

- cards-ui新增export openRewardChest(chest)；combat與loop→cards-ui沿用既有依賴方向。三近戰及子彈共用單次_claim判定；合作任一人開箱，P1與P2各自選卡。普通箱各一輪；大箱各4／5輪。cards-ui.init新增isCoop與sendP2Pick注入。P1的showPick(src,specificCard,pickCtx,options)保留獨立佇列，options.rounds在真正開始時設定，不覆寫當前多輪；幸運／擲幣回呼保存持有者，點擊與重骰限制本輪一次。
- coop新增export resetCoopSession，主startGame建立g後清除P2旧offer／输入与窗口。_sendP2Pick排隊，publishP2Offer按P2職業與背包沿用pks加權。_applyP2Card(cardId,offerId)、_handleP2Reroll(idx,offerId)介面新增offerId；主機驗證本輪候選、先消耗再加卡，重骰每格一次及seen集合。幸運幣、探索靴、命運轉輪續抽改走P2自己的隊列；AI也同路徑，無重複扣大箱輪次。
- showCoopPick同輪同revision不重建、低revision忽略，保留重骰已用狀態；CLIENT選擇後鎖按鍵等待主機確認，p2pickdone或狀態中的null才收起。每個狀態带p2Offer，可重補畫面。選卡者暫停移動／攻擊／技能，持續受傷保護；另一人可繼續冒險。
- main雙人分支inv2.length=0，避免更換背包參照；接收背包用splice原地更新。syncCoopBindings在切mode／net／AI時更新loop、combat、skills、HUD、Boss與enemy，包含練習連線。
- _coopStartReal先建立game，HOST等待P2職業確認後才開戰，CLIENT選角前不寫入舊game；提示等待隊友。sessionId防跨局輸入／選卡，seq防舊畫面／輸入倒退。舊peer／conn所有open／data／close／error忽略非目前實例。正式自訂房至少4碼且統一大寫，重回建房重置開始鈕。
- sendHostSnapshot內部函式約33毫秒一次，暫停200毫秒一次；RTCDataChannel.bufferedAmount>262144或PeerJS bufferSize>2跳過整圖快照。CLIENT操作约33毫秒，單次動作即時送出，積壓時保留未送動作；HOST用OR保留直到遊戲邏輯消耗，800毫秒無輸入則停止移動。
- serializeCoopState新增sessionId、seq、gameOver、waitingPlayer、p2Offer。applyCoopState把run=false視為_remotePaused；真正gameOver才觸發結束。暫停不再误判死亡。CLIENT角色斷線時不回退成HOST跑第二套敵人邏輯。
- 玩家無敵与敵人護盾破除／黑洞處決／流血／嘲諷等期限改剩餘時間传送，在CLIENT還原本機時鐘。P2閃避無敵300毫秒独立清除；P2無怪時也瞄準附近可開寶箱。
- 發布必要build成功；依使用者要求未跑實際雙人、瀏覽器操作或自動回歸測試。逐段問題與修正紀錄在docs/雙人通關修正紀錄.md，不宣稱不同網路環境全部穩定。

- coop另新增beginCoopRun(charType)，_coopStartReal只沿用startGame。主startGame每次coop都呼叫beginCoopRun，因此再來一次也同步新session与角色確認；CLIENT重試經restartrequest由HOST開新局，不自行建立第二套地圖。轉單人先清_net再銷毀旧peer，避免單人技能還被誤當CLIENT操作。
