// Pure constants, character/mode definitions
export const PI = Math.PI, TAU = PI * 2;
export const MW = 1900, MH = 1900;
export const PR = 18, ER = 16, BR = 5, PS = 4.5;
export const AUTO_CD = 500, HOLD_CD = 115;
export const ULT_CHARGE_NEED = 100;
export const BH_DURATION_MS = 3000;
export const BH_COOLDOWN_MS = 20000;
export const CRATE_HP = 8;
export const BOSS_EVERY = 8;
export const EXP_BASE = 50, EXP_SCALE = 1.20;
export const MAX_PARTICLES = 300;
export const MAX_BULLETS = 120;
export const MAX_ENEMIES = 140;
export const SP_B = 1280;
export const SPAWN_R = 320;
export const ULT_D = 55;
export const MAX_EBULLETS = 80;
export const PLAYER_DMG_SCALE = .84;
export const ENEMY_HP_SCALE = 1.18;
export const LIGHTNING_CAP = 78;
export const HOLD_COOLDOWN_NEED = 15e3;

export const ROLE_NORMAL = "n", ROLE_FLANKER = "f", ROLE_SHOOTER = "s", ROLE_DASHER = "d", ROLE_SHIELD = "sh";

export const CHAR = {
  gunner:    {startHp:100,startAtk:2.5,startSpeed:5, fr:1,   crit:.05, dodge:0,   armor:0,   col:"#74C0FC",colMid:"#d4e8ff",colDark:"#4DABF7",
              passive:"狙擊：子彈穿透全部 傷害1.5倍 CD5秒",passiveKey:"none",
              atkType:"ranged", atkCD:null, animDur:200, skillIcon:"🎯", skillCD:3000},
  swordsman: {startHp:150,startAtk:5,  startSpeed:5.5,fr:1,  crit:.05, dodge:.08, armor:.05, col:"#FF922B",colMid:"#ffe0b2",colDark:"#E8590C",
              passive:"劍氣：每5次攻擊釋放穿透劍氣(200%傷害)",passiveKey:"swordqi",
              atkType:"melee", atkCD:320, animDur:320, skillIcon:"⚔️", skillCD:3000},
  tank:      {startHp:200,startAtk:3,  startSpeed:4, fr:1,   crit:.05, dodge:0,   armor:.15, col:"#51CF66",colMid:"#c8e6c9",colDark:"#2E7D32",
              passive:"鐵壁：受傷反彈15%+每5秒回10HP",passiveKey:"ironwall",
              atkType:"melee", atkCD:280, animDur:280, skillIcon:"🛡️", skillCD:5000},
  assassin:  {startHp:60, startAtk:2.5,startSpeed:5.7,fr:1,   crit:.15, dodge:.40, armor:0,   col:"#DDB4FE",colMid:"#F3E4FF",colDark:"#C577F2",
              passive:"疾風連刺：攻速極快、閃避率極高，擊殺敵人加速2秒",passiveKey:"swiftstrike",
              atkType:"melee", atkCD:150, animDur:150, skillIcon:"🗡️", skillCD:1700}
};
export function charCfg(ct) { return CHAR[ct] || CHAR.gunner; }

export const MODE = {
  classic:{
    startAtk:2.5,startHp:120,startSpeed:PS,
    maxEnemies:140,spawnBase:1280,spawnWaveMul:65,
    enemyContactVanish:true,
    atkPerLv:2,hpPerLv:10,
    smallHpBase:null,
  },
  elite:{
    startAtk:5,startHp:200,startSpeed:5.2,
    maxEnemies:8,spawnBase:3000,spawnWaveMul:30,
    enemyContactVanish:false,
    atkPerLv:2,hpPerLv:15,dmgCap:1.2,
    mapW:1200,mapH:1200,
    smallHpBase:200,smallHpPerWave:20,
    eliteHpBase:800,eliteHpPerWave:40,
    eliteChance:.2,
    eliteStartWave:5,
    enemySpdCap:2.0,
  },
  coop:{
    startAtk:4,startHp:180,startSpeed:5,
    maxEnemies:12,spawnBase:2500,spawnWaveMul:40,
    enemyContactVanish:false,
    atkPerLv:2,hpPerLv:12,dmgCap:1.2,
    mapW:1400,mapH:1400,
    smallHpBase:250,smallHpPerWave:30,
    eliteHpBase:900,eliteHpPerWave:50,
    eliteChance:.18,eliteStartWave:4,
    enemySpdCap:2.2,
    coopHpMul:1.5,
  }
};

export const RW = {R:48, SR:38, SSR:14};
export const RC = {R:"#74C0FC", SR:"#DA77F2", SSR:"#FFD43B"};

export const RECOMMENDED = {
  tank: new Set(["大地震擊","鋼鐵意志","堅韌心","生命果","石膚術","荊棘之盾"]),
  gunner: new Set(["無盡之刃","分裂彈","鐵壁金身","創世神力","萬物吞噬","影分身"]),
  swordsman: new Set(["鐵壁金身","天使之翼","毀滅之手","劍氣強化","拔刀術","萬物吞噬","創世神力","達摩的光劍"]),
  assassin: new Set(["致命打擊","暗影步","毒刃","連環殺戮","無盡之刃","鐵壁金身"])
};

export const RG = {R:"0 0 6px #74C0FC40", SR:"0 0 10px #DA77F260", SSR:"0 0 14px #FFD43B80,0 0 28px #FF922B40"};
export const LVC = ["#fff","#74C0FC","#FFD43B"];
export const EC = ["#FF8787","#FFA94D","#DA77F2","#66D9E8","#C0EB75","#F783AC","#FFD43B","#ADB5BD"];
export const TC = [["#FF8787","#FFA94D","#66D9E8","#C0EB75","#F783AC"],["#FF6B6B","#E8590C","#FFA94D","#F06595","#CC5DE8"],["#868E96","#ADB5BD","#FF922B","#E8590C","#CED4DA"],["#BE4BDB","#9C36B5","#7950F2","#DA77F2","#845EF7"],["#FF4444","#C92A2A","#E03131","#FA5252","#862E2E"]];

// pickRole is a pure function based on wave count
export function pickRole(wave, boss) {
  if (boss) return ROLE_NORMAL;
  const w = [];
  w.push({r: ROLE_NORMAL, wt: 10});
  if (wave >= 6) w.push({r: ROLE_FLANKER, wt: Math.min((wave - 5) * 1.2, 6)});
  if (wave >= 8) w.push({r: ROLE_SHOOTER, wt: Math.min((wave - 7) * 1.0, 5)});
  if (wave >= 10) w.push({r: ROLE_DASHER, wt: Math.min((wave - 9) * 0.8, 4)});
  if (wave >= 12) w.push({r: ROLE_SHIELD, wt: Math.min((wave - 11) * 0.7, 3.5)});
  let total = w.reduce((a, b) => a + b.wt, 0), roll = Math.random() * total;
  for (const e of w) { roll -= e.wt; if (roll <= 0) return e.r; }
  return ROLE_NORMAL;
}
