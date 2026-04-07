# Cute RPG Action Shooter — Architecture

## Module Overview

| Module | Purpose |
|--------|---------|
| `src/main.js` | Entry point and glue code (~350 lines). Owns top-level state (g, _mode, _charType, _net, inv, etc.), wires all modules together via initXxx(deps), implements startGame(), overGoHome(), showCharSelect(), pickChar(), and the data-action event delegation listener. |
| `src/state.js` | Legacy shared state object S — originally intended as a central store; most modules now use their own module-level vars via dependency injection. Still holds dragon-pet sprite references. |
| `src/config.js` | Pure constants: map dimensions, player/enemy radii, cooldown timings, CHAR definitions (gunner/swordsman/tank — each with atkType/atkCD/animDur/skillIcon/skillCD for extensibility), MODE definitions (classic/elite/coop/practice), rarity weights/colors, charCfg() helper, and the pickRole() function. |
| `src/cards.js` | Defines the C array of 52 card objects (each with id, name, emoji, rarity, description, and ap[] level-up functions). Also exports rndBuff() for random stat bonuses. |
| `src/utils.js` | Four pure utility functions: di (distance), cl (clamp), rn (random in range), $ (getElementById). |
| `src/audio.js` | Web Audio API synthesizer for all BGM and SFX. Manages a single AudioContext, plays looping BGM via OscillatorNode chains, and synthesizes game sounds (shoot, hit) procedurally. |
| `src/render.js` | All canvas drawing primitives: drawPlayer(), drawEnemy(), burst() particles, addLtn() lightning, drawPoly(), drawStar(), bCol() element color resolver, WP weapon configs, getWpn(). Owns the par[] particle pool and the fxQ render quality flag. |
| `src/hud.js` | HUD overlay (health bars, XP bar, wave/kill counters, ult charge ring), floating damage numbers (showPlayerDmg), hint queue (showHint), and minimap (drawMinimap). |
| `src/input.js` | Joystick touch tracking, keyboard input (ks object), mouse input, and the skill/ult button. Exports joy/aim state objects, setupInputListeners(), and request flags for coop (getClientUltReq, getClientDodgeReq). |
| `src/enemies.js` | Enemy spawning (spawn()), wave parameters (spawnTargetForWave, spikeConfigForWave), enemy growth curves (enemyGrowth, tierHpFor), crate generation (genCrates, spawnBonusCrates), spike wave and hunt pressure triggers. |
| `src/combat.js` | Bullet firing (fire()), sword swing (swordSwing()), shield bash (shieldBash()), auto-attack dispatch (tapAtk()), nearest-target query (nearestTargets()), kill award (awardEnemyKill()), and death settlement (settleEnemyDeaths()). |
| `src/skills.js` | Character special skills (useCharSkill, skillSnipe, skillGhostSlash, skillTaunt), dash (_startDash), and ultimate (doUlt). Manages skill/ult cooldown state and dash ghost trail. Skill dispatch uses SKILL_FN registry — new characters register via registerSkill(). |
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
- `CHAR` — character definitions, each with: startHp/Atk/Speed, fr, crit, dodge, armor, col/colMid/colDark, passive/passiveKey, atkType, atkCD, animDur, skillIcon, skillCD
- `charCfg(ct)` — get CHAR config for type ct with fallback to gunner
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
- `SKILL_CDS` — cooldown durations per character type (Proxy, reads from CHAR config via charCfg)
- `registerSkill(charType, fn)` — register a skill function for a new character type
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

- **想改 Boss DPS 估算（天使卡觸發條件）？** → 改 `src/boss.js` 的 `estimateBossDPS()` 函式和 `bossDR` 值。`estTime > 120` 觸發天使卡。
- **想改經驗追趕機制？** → 改 `src/loop.js` 搜尋 `_xpCatchUp`（經驗倍率）和 `_gapWarn`（提示觸發）
- **想改 Coop ICE/TURN 伺服器？** → 改 `src/coop.js` 的 `_ICE_CFG` 物件

---

## Media Assets

遊戲使用的外部媒體檔案（非程式碼產生的資源）。

| 檔案 | 位置 | 引用處 | 用途 |
|------|------|--------|------|
| `One_More_Credit.mp3` | 根目錄 + `assets/` | `src/audio.js:14` (`"./One_More_Credit.mp3"`) | BGM 背景音樂 |
| `END_clip_clean.mp4` | 根目錄 + `assets/` | `src/ui.js:183` (`"./assets/END_clip_clean.mp4"`) | 通關影片（勝利後播放） |

### Vite 靜態資源機制

- `vite.config.js` 設定 `publicDir: 'assets'`，build 時 `assets/` 內的檔案會自動複製到 `dist/`
- 根目錄的 `.mp3`/`.mp4` 也透過 HTML 相對路徑引用，Vite build 時一併複製
- **注意**：根目錄和 `assets/` 各有一份相同檔案（歷史因素），程式碼引用的是根目錄路徑

### 龍寵精靈圖

龍寵的翅膀和身體圖片以 base64 PNG 內嵌在 `src/state.js` 中（`S._dpWingImg` / `S._dpBodyImg`），不依賴外部檔案。

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
- **想加新角色？** → 見下方「新增角色步驟」
- **想改音效？** → 改 `src/audio.js` 的 `sfx()` 函式或 BGM 合成器
- **想改 HUD 顯示？** → 改 `src/hud.js` 的 `hud()` 函式
- **想改設定畫面？** → 改 `src/ui.js` 的 `openSettings()`
- **想改多人連線邏輯？** → 改 `src/coop.js`
- **想改練習模式？** → 改 `src/practice.js`
- **想改遊戲主迴圈節奏？** → 改 `src/loop.js` 的 `loop()` 函式

### 新增角色步驟

以下列出新增一個角色（如「刺客 assassin」）時需要修改的所有檔案：

1. **`src/config.js`** — 在 `CHAR` 物件加一筆，必須包含：
   - 基礎數值：`startHp`, `startAtk`, `startSpeed`, `fr`, `crit`, `dodge`, `armor`
   - 顏色：`col`, `colMid`, `colDark`
   - 被動說明：`passive`, `passiveKey`
   - **擴展欄位**：`atkType`("ranged"|"melee"), `atkCD`(毫秒,null=用HOLD_CD), `animDur`(毫秒), `skillIcon`(emoji), `skillCD`(毫秒)
   - 在 `RECOMMENDED` 加推薦卡片 Set
2. **`src/skills.js`** — 在 `SKILL_FN` 物件加技能函式，或呼叫 `registerSkill(charType, fn)`
3. **`src/loop.js`** — P1/P2 攻擊分支（搜尋 `swordSwing`/`shieldBash`）加 `else if`
4. **`src/combat.js`** — `tapAtk()` 加攻擊分支
5. **`src/render.js`** — `drawPlayer()` 加角色外觀繪製（目前未知角色 fallback 為坦克造型）
6. **`src/cards.js`** — （選配）加專屬卡片，用 `charReq: "assassin"` 限定
7. **`index.html`** — 角色選擇 UI（`#charSelectOv`）加第四張角色卡片

攻擊間隔、動畫時長、技能CD、技能按鈕圖示皆從 `CHAR` config 自動讀取（`charCfg()`），不需額外硬編碼。
