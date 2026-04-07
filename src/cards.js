import { rn } from "./utils.js";

export const C = [];
let CID = 0;
function card(n,e,r,tp,d,ap,c,fx,once){C.push({id:++CID,n,e,r,tp,d,ap,c,fx:fx||null,once:!!once});}
// once=1 的卡片只能拿一次、不能升級（拿過後不再出現在選卡池）。
// 它們的 3 個等級定義相同是因為 card() 固定吃 [Lv1,Lv2,Lv3] 陣列，並非設計失誤。
// once 卡：幸運幣、磁力場、自癒術、鐵壁金身、守護星、影分身、閃電步、命運轉輪、時間停止。
// --- R: 17 cards ---
// NOTE: 以下卡牌升級時數值為「疊加」而非「替換」，屬暫時設計降低難度。
// 若主角太強可改為直接賦值(如毒刺)：閃避斗篷/虛空步(疊加可超100%無敵)、
// 回血斬/吸血領主(吸血疊加)、分裂彈(子彈數疊加)、自癒術(回血疊加)、
// 星辰劍(暴擊可超100%)、召喚球、連鎖爆破/毀滅之手(deathBoom雙重觸發+疊加)。
card("火焰彈","🔥","R","atk",["攻+4 火焰 燒傷+20% 王燃+40%","攻+8 烈焰 燒傷+35% 王燃+70%","攻+14 獄火 燒傷+50% 王燃+100%"],[s=>{s.atk+=4;s.burnBoost=(s.burnBoost||1)*1.2;s.burnBossMul=Math.max(s.burnBossMul||1,1.4);s.fx.fire=1},s=>{s.atk+=8;s.burnBoost=(s.burnBoost||1)*1.35;s.burnBossMul=Math.max(s.burnBossMul||1,1.7);s.fx.fire=2},s=>{s.atk+=14;s.burnBoost=(s.burnBoost||1)*1.5;s.burnBossMul=Math.max(s.burnBossMul||1,2);s.fx.fire=3}],"#FF6B6B","fire");
card("冰錐","❄️","R","atk",["攻+2 減速30% 冰脆+15%","攻+5 減速50% 冰脆+25%","攻+8 凍結70% 冰脆+35%"],[s=>{s.atk+=2;s.slow=Math.max((s.slow||1)*.7,.3);s.iceFrag=Math.max(s.iceFrag||0,.15);s.fx.ice=1},s=>{s.atk+=5;s.slow=Math.max((s.slow||1)*.5,.2);s.iceFrag=Math.max(s.iceFrag||0,.25);s.fx.ice=2},s=>{s.atk+=8;s.slow=.3;s.iceFrag=Math.max(s.iceFrag||0,.35);s.fx.ice=3}],"#66D9E8","ice");
card("生命果","🍎","R","pas",["HP+75","HP+150","HP+200 防禦+10%"],[s=>{s.maxHp+=75;s.hp=Math.min(s.hp+75,s.maxHp)},s=>{s.maxHp+=150;s.hp=Math.min(s.hp+150,s.maxHp)},s=>{s.maxHp+=200;s.hp=Math.min(s.hp+200,s.maxHp);s.armor=1-(1-s.armor)*.9}],"#51CF66");
card("疾風靴","👟","R","pas",["閃避+5% 位移CD-15%","閃避+10% 位移CD-30%","閃避+18% 位移CD-50%"],[s=>{s.dodge=Math.min(1,(s.dodge||0)+.05);s.ultCdReduce=1-(1-(s.ultCdReduce||0))*.85},s=>{s.dodge=Math.min(1,(s.dodge||0)+.1);s.ultCdReduce=1-(1-(s.ultCdReduce||0))*.7},s=>{s.dodge=Math.min(1,(s.dodge||0)+.18);s.ultCdReduce=1-(1-(s.ultCdReduce||0))*.5}],"#74C0FC");
card("連弩","🏹","R","atk",["攻速+12%","攻速+25%","攻速+40%"],[s=>{s.fr*=_isElite()?.76:.88},s=>{s.fr*=_isElite()?.5:.75},s=>{s.fr*=_isElite()?.3:.6}],"#FFA94D");
card("鏡盾","🪞","R","pas",["受傷-10%","受傷-22%","受傷-35%"],[s=>{s.armor=1-(1-s.armor)*.9},s=>{s.armor=1-(1-s.armor)*.78},s=>{s.armor=1-(1-s.armor)*.65}],"#B2F2BB");
card("自癒術","💗","R","pas",["每0.5秒回10HP","每0.5秒回10HP","每0.5秒回10HP"],[s=>{s.regen=(s.regen||0)+20},s=>{s.regen=(s.regen||0)+20},s=>{s.regen=(s.regen||0)+20}],"#FFC9C9",null,1);
card("學者帽","🎓","R","pas",["經驗+20%","經驗+45%","經驗+80%"],[s=>{s.expMul=(s.expMul||1)*1.2},s=>{s.expMul=(s.expMul||1)*1.45},s=>{s.expMul=(s.expMul||1)*1.8}],"#D0BFFF");
card("幸運幣","🍀","R","pas",["額外三選一","額外三選一","額外三選一"],[s=>{s._luckyPick=true},s=>{s._luckyPick=true},s=>{s._luckyPick=true}],"#8CE99A",null,1);
card("集氣珠","🔋","R","pas",["集氣速度+20%","集氣速度+40%","集氣速度+70%"],[s=>{s.ultRate=(s.ultRate||1)*1.2},s=>{s.ultRate=(s.ultRate||1)*1.4},s=>{s.ultRate=(s.ultRate||1)*1.7}],"#E599F7");
card("磁力場","🧲","R","pas",["全螢幕吸取經驗","全螢幕吸取經驗","全螢幕吸取經驗"],[s=>{s.expR=99},s=>{s.expR=99},s=>{s.expR=99}],"#339AF0",null,1);
card("毒刺","🌿","R","atk",["中毒3秒 毒傷+2 王毒+30%","中毒5秒 毒傷+4 王毒+60%","劇毒7秒 毒傷+6 王毒+100%"],[s=>{s.poison=3;s.poisonDmg=2;s.poisonBossMul=1.3;s.fx.poison=1},s=>{s.poison=5;s.poisonDmg=4;s.poisonBossMul=1.6;s.fx.poison=2},s=>{s.poison=7;s.poisonDmg=6;s.poisonBossMul=2;s.fx.poison=3}],"#A9E34B","poison");
card("穿透之力","🔱","R","atk",["穿透+1 攻+2 王傷+20%","穿透+2 攻+4 王傷+40%","穿透極 攻+7 王傷+60%"],[s=>{s.pierce=(s.pierce||0)+1;s.atk+=2;s.bossDmg=(s.bossDmg||1)*1.2},s=>{s.pierce=(s.pierce||0)+2;s.atk+=4;s.bossDmg=(s.bossDmg||1)*1.4},s=>{s.pierce=99;s.atk+=7;s.bossDmg=(s.bossDmg||1)*1.6}],"#F08C00");
card("蓄力拳","👊","R","atk",["攻+5 每5次重擊×2","攻+10 每4次重擊×2","攻+16 每3次重擊×2"],[s=>{s.atk+=5;s.heavyEvery=5},s=>{s.atk+=10;s.heavyEvery=4},s=>{s.atk+=16;s.heavyEvery=3}],"#E8590C");
card("回血斬","💉","R","pas",["擊殺回5HP","回12HP","回22HP"],[s=>{s.ls=(s.ls||0)+5},s=>{s.ls=(s.ls||0)+12},s=>{s.ls=(s.ls||0)+22}],"#E64980");
card("探索靴","🗺️","R","pas",["閃避+4% 經驗範圍+25%","閃避+8% 經驗範圍+55%","閃避+15% 經驗範圍+100%"],[s=>{s.dodge=Math.min(1,(s.dodge||0)+.04);s.expR=(s.expR||1)*1.25},s=>{s.dodge=Math.min(1,(s.dodge||0)+.08);s.expR=(s.expR||1)*1.55},s=>{s.dodge=Math.min(1,(s.dodge||0)+.15);s.expR=(s.expR||1)*2}],"#12B886");
card("堅韌心","🫀","R","pas",["HP+50 回血+8/秒","HP+100 回血+15/秒","HP+150 回血+20/秒"],[s=>{s.maxHp+=50;s.hp=Math.min(s.hp+50,s.maxHp);s.regen=(s.regen||0)+8},s=>{s.maxHp+=100;s.hp=Math.min(s.hp+100,s.maxHp);s.regen=(s.regen||0)+15},s=>{s.maxHp+=150;s.hp=Math.min(s.hp+150,s.maxHp);s.regen=(s.regen||0)+20}],"#FF922B");
// --- SR: 21 cards ---
card("石膚術","🪨","SR","pas",["撞擊傷害上限40"],[s=>{s.contactCap=40}],"#ADB5BD",null,1);
card("雷擊鏈","⚡","SR","atk",["連鎖雷電 鏈傷+30% 小怪+30%","鏈傷+50% 小怪+50%","鏈傷+80% 小怪+80%"],[s=>{s.chain=1;s.chainDmg=(s.chainDmg||1)*1.3;s.mobDmg=(s.mobDmg||1)*1.3;s.fx.lightning=1},s=>{s.chain=1;s.chainDmg=(s.chainDmg||1)*1.5;s.mobDmg=(s.mobDmg||1)*1.5;s.fx.lightning=2},s=>{s.chain=1;s.chainDmg=(s.chainDmg||1)*1.8;s.mobDmg=(s.mobDmg||1)*1.8;s.fx.lightning=3}],"#FAB005","lightning");
card("分裂彈","💎","SR","atk",["3發","5發","7發彈幕"],[s=>{s.split=(s.split||1)+2},s=>{s.split=(s.split||1)+4},s=>{s.split=(s.split||1)+6}],"#845EF7");C[C.length-1].charReq="gunner";
card("閃避斗篷","🌀","SR","pas",["12%閃避","25%閃避","40%閃避"],[s=>{s.dodge=(s.dodge||0)+.12},s=>{s.dodge=(s.dodge||0)+.25},s=>{s.dodge=(s.dodge||0)+.4}],"#B197FC");
card("鐵壁金身","🔔","SR","pas",["完全免疫遠程攻擊","完全免疫遠程攻擊","完全免疫遠程攻擊"],[s=>{s.projImmune=true},s=>{s.projImmune=true},s=>{s.projImmune=true}],"#CED4DA",null,1);
card("守護星","🛡️","SR","pas",["每8秒自動護盾","每8秒自動護盾","每8秒自動護盾"],[s=>{s.shieldCD=8e3;s._sh=true;s._shT=0;s._shSpawn=performance.now()},s=>{s.shieldCD=8e3;s._sh=true;s._shT=0;s._shSpawn=performance.now()},s=>{s.shieldCD=8e3;s._sh=true;s._shT=0;s._shSpawn=performance.now()}],"#4DABF7",null,1);
card("影分身","👥","SR","pas",["100%前後攻擊","100%前後攻擊","100%前後攻擊"],[s=>{s.dblAtk=1},s=>{s.dblAtk=1},s=>{s.dblAtk=1}],"#868E96",null,1);
card("烈焰風暴","🌋","SR","atk",["攻+4 濺射 王燃+50%","攻+8 大濺射 王燃+80%","攻+14 超大濺射 王燃+120%"],[s=>{s.atk+=4;s.splash=(s.splash||0)+30;s.burnBossMul=Math.max(s.burnBossMul||1,1.5);s.fx.fire=Math.max(s.fx.fire||0,2)},s=>{s.atk+=8;s.splash=(s.splash||0)+45;s.burnBossMul=Math.max(s.burnBossMul||1,1.8);s.fx.fire=3},s=>{s.atk+=14;s.splash=(s.splash||0)+60;s.burnBossMul=Math.max(s.burnBossMul||1,2.2);s.fx.fire=3}],"#E03131","fire");
card("暴風雪","🌨️","SR","atk",["攻+3 凍結50% 冰脆+20%","攻+6 凍結70% 冰脆+30%","攻+10 凍結80% 冰脆+40%"],[s=>{s.atk+=3;s.slow=Math.max((s.slow||1)*.5,.2);s.iceFrag=Math.max(s.iceFrag||0,.2);s.fx.ice=2},s=>{s.atk+=6;s.slow=.3;s.iceFrag=Math.max(s.iceFrag||0,.3);s.fx.ice=3},s=>{s.atk+=10;s.slow=.2;s.iceFrag=Math.max(s.iceFrag||0,.4);s.fx.ice=3}],"#339AF0","ice");
card("追蹤彈","🎯","SR","atk",["微追蹤","強追蹤 範圍↑ 攻+3","完美追蹤 攻+6 穿透1"],[s=>{s.homing=.03;s.homingR=200},s=>{s.homing=.06;s.homingR=320;s.atk+=3},s=>{s.homing=.1;s.homingR=400;s.atk+=6;s.pierce=(s.pierce||0)+1}],"#F06595");C[C.length-1].charReq="gunner";
card("吸血領主","🦇","SR","pas",["擊殺回12HP","回25HP","回40HP+攻+5"],[s=>{s.ls=(s.ls||0)+12},s=>{s.ls=(s.ls||0)+25},s=>{s.ls=(s.ls||0)+40;s.atk+=5}],"#C2255C");
card("召喚球","🪐","SR","atk",["1顆環繞守護球","2顆環繞守護球","3顆環繞守護球"],[s=>{s.orbiters=(s.orbiters||0)+1},s=>{s.orbiters=(s.orbiters||0)+2},s=>{s.orbiters=(s.orbiters||0)+3}],"#FCC419");
card("旋風斬","🌪️","SR","atk",["風刃追擊3秒","2道風刃追擊","3道風刃追擊"],[s=>{s.windBlades=1;s.fx.whirl=1},s=>{s.windBlades=2;s.fx.whirl=2},s=>{s.windBlades=3;s.fx.whirl=3}],"#99E9F2");
card("狂暴之力","💢","SR","pas",["HP<30%時 攻擊翻倍","HP<40%時 攻擊翻倍","HP<50%時 攻擊翻倍"],[s=>{s.berserk=.3},s=>{s.berserk=.4},s=>{s.berserk=.5}],"#FF6B6B");
card("連鎖爆破","💥","SR","atk",["敵人死亡後爆炸 周圍傷8","敵人死亡 周圍傷18","敵人死亡 周圍傷30"],[s=>{s.deathBoom=(s.deathBoom||0)+8},s=>{s.deathBoom=(s.deathBoom||0)+18},s=>{s.deathBoom=(s.deathBoom||0)+30}],"#FF922B");
card("破甲箭","🪡","SR","atk",["攻+3 armor cap+25%","攻+4 armor cap+35%","攻+5 armor cap+50% 穿透+1"],[s=>{s.atk+=3;s.armorCapBonus=(s.armorCapBonus||0)+.25},s=>{s.atk+=4;s.armorCapBonus=(s.armorCapBonus||0)+.35},s=>{s.atk+=5;s.armorCapBonus=(s.armorCapBonus||0)+.5;s.pierce=(s.pierce||0)+1}],"#D4A017");
card("迴力鏢","🪃","SR","atk",["攻+2 1個迴力鏢","攻+5 2個迴力鏢","攻+8 3個迴力鏢 穿透+1"],[s=>{s.atk+=2;s.boomerang=1},s=>{s.atk+=5;s.boomerang=2;s.homingR=(s.homingR||200)+40},s=>{s.atk+=8;s.boomerang=3;s.pierce=(s.pierce||0)+1}],"#20C997");
card("機關槍","🔫","SR","atk",["攻速+30% 攻-3","攻速+60% 攻-5 無過熱","攻速+100% 攻-8 狂暴模式"],[s=>{s.fr*=.7;s.atk=Math.max(1,s.atk-3);s._minigun=1},s=>{s.fr*=.4;s.atk=Math.max(1,s.atk-5);s._minigun=2;s._noOverheat=true},s=>{s.fr*=.5*.4;s.atk=Math.max(1,s.atk-8);s._minigun=3;s._noOverheat=true;s._minigunBerserk=true}],"#FF8C00");C[C.length-1].charReq="gunner";
card("閃電步","💫","SR","pas",["大招衝刺+殘影+無敵 CD同步大招","大招衝刺+殘影+無敵 CD同步大招","大招衝刺+殘影+無敵 CD同步大招"],[s=>{s.lStep=true;s.lStepDur=200;s.lStepSpd=8},s=>{s.lStep=true;s.lStepDur=200;s.lStepSpd=8},s=>{s.lStep=true;s.lStepDur=200;s.lStepSpd=8}],"#FFE066",null,1);
card("元素精通","🔮","SR","pas",["元素傷害+15%","元素傷害+30%","元素傷害+50%"],[s=>{s.elemBoost=(s.elemBoost||1)*1.15},s=>{s.elemBoost=(s.elemBoost||1)*1.3},s=>{s.elemBoost=(s.elemBoost||1)*1.5}],"#B197FC");
card("大招增幅","☄️","SR","pas",["大招傷害+30%","傷害+60%","傷害+100%"],[s=>{s.ultDmgMul=(s.ultDmgMul||1)*1.3},s=>{s.ultDmgMul=(s.ultDmgMul||1)*1.6},s=>{s.ultDmgMul=(s.ultDmgMul||1)*2}],"#BE4BDB");
card("彈幕之王","🎆","SR","atk",["子彈+1 攻速+8%","子彈+2 攻速+15%","子彈+3 攻速+25%"],[s=>{s.split=(s.split||1)+1;s.fr*=.92},s=>{s.split=(s.split||1)+2;s.fr*=.85},s=>{s.split=(s.split||1)+3;s.fr*=.75}],"#FF6B6B");C[C.length-1].charReq="gunner";
// --- SSR: 13 cards ---
card("龍之心","🐉","SSR","atk",["攻+8 龍息錐形+濺射30","攻+16 龍息強化+濺射50","攻+25 龍息極+濺射80 HP+80"],[s=>{s.atk+=8;s._dragonBreath=1;s.splash=Math.max(s.splash||0,30);s.fx.dragon=1},s=>{s.atk+=16;s._dragonBreath=2;s.splash=Math.max(s.splash||0,50);s.fx.dragon=2},s=>{s.atk+=25;s._dragonBreath=3;s.splash=Math.max(s.splash||0,80);s.maxHp+=80;s.hp=s.maxHp;s.fx.dragon=3}],"#FF922B","dragon");
card("星辰劍","⭐","SSR","atk",["攻+8 暴擊+20%","攻+16 暴擊+35%","攻+28 暴擊+50%"],[s=>{s.atk+=8;s.crit=(s.crit||.05)+.2;s.fx.star=1},s=>{s.atk+=16;s.crit=(s.crit||.05)+.35;s.fx.star=2},s=>{s.atk+=28;s.crit=(s.crit||.05)+.5;s.fx.star=3}],"#F06595","star");
card("時光沙","⏳","SSR","atk",["攻速+40%集氣+30%","攻速+60%集氣+50%","攻速+80%集氣+80%"],[s=>{s.fr*=.6;s.ultRate=(s.ultRate||1)*1.3},s=>{s.fr*=.4;s.ultRate=(s.ultRate||1)*1.5},s=>{s.fr*=.2;s.ultRate=(s.ultRate||1)*1.8}],"#20C997");
card("不死鳥","🔮","SSR","pas",["復活1次+怪物撤退","復活2次+怪物撤退","復活3次+滿血+怪物撤退"],[s=>{s.revive=Math.max(s.revive||0,1);s.fx.phoenix=1},s=>{s.revive=Math.max(s.revive||0,2);s.fx.phoenix=2},s=>{s.revive=Math.max(s.revive||0,3);s.hp=s.maxHp;s.fx.phoenix=3}],"#BE4BDB");
card("黑洞","🕳️","SSR","atk",["大招變黑洞","大招黑洞 傷害+35%","大招黑洞 傷害+70%"],[s=>{s.hasBH=true;s.ultLv=1;g.ultCharge=0;g.ultCdEnd=0},s=>{s.hasBH=true;s.ultLv=2;g.ultCharge=0;g.ultCdEnd=0},s=>{s.hasBH=true;s.ultLv=3;g.ultCharge=0;g.ultCdEnd=0}],"#495057");
card("天使之翼","👼","SSR","pas",["每10秒無敵3秒","每5秒無敵3秒","每3秒無敵2秒"],[s=>{s.invCD=10e3;s.invDur=3e3},s=>{s.invCD=5e3;s.invDur=3e3},s=>{s.invCD=3e3;s.invDur=2e3}],"#FFF3BF");
card("毀滅之手","🤚","SSR","atk",["攻+12 死亡爆炸傷20","攻+22 死亡爆炸傷35","攻+35 死亡爆炸傷50"],[s=>{s.atk+=12;s.deathBoom=(s.deathBoom||0)+20;s.fx.fire=Math.max(s.fx.fire||0,2)},s=>{s.atk+=22;s.deathBoom=(s.deathBoom||0)+35;s.fx.fire=3},s=>{s.atk+=35;s.deathBoom=(s.deathBoom||0)+50;s.fx.fire=3}],"#E03131","fire");
card("無盡之刃","🗡️","SSR","atk",["攻+10 穿透全部","攻+20 穿透全部","攻+35 穿透全部+連鎖"],[s=>{s.atk+=10;s.pierce=99;s.fx.star=1},s=>{s.atk+=20;s.pierce=99;s.fx.star=2},s=>{s.atk+=35;s.pierce=99;s.chain=(s.chain||0)+2;s.fx.star=3}],"#FFD43B","star");
card("虛空步","🌑","SSR","pas",["35%閃避+反擊傷10","50%閃避+反擊傷15","65%閃避+反擊傷30"],[s=>{s.dodge=(s.dodge||0)+.35;s.dodgeAtk=(s.dodgeAtk||0)+10},s=>{s.dodge=(s.dodge||0)+.5;s.dodgeAtk=(s.dodgeAtk||0)+15},s=>{s.dodge=(s.dodge||0)+.65;s.dodgeAtk=(s.dodgeAtk||0)+30}],"#343A40");
card("命運轉輪","🎰","SSR","pas",["重抽所有能力+強化","重抽所有能力+強化","重抽所有能力+強化"],[s=>{s._fateWheel=true},s=>{s._fateWheel=true},s=>{s._fateWheel=true}],"#F59F00",null,1);
card("混沌核心","⚛️","SSR","atk",["隨機3項能力提升","隨機5項能力提升","隨機8項能力提升"],[s=>{for(let i=0;i<3;i++)rndBuff(s)},s=>{for(let i=0;i<5;i++)rndBuff(s)},s=>{for(let i=0;i<8;i++)rndBuff(s)}],"#E599F7");
card("時間停止","⏸️","SSR","pas",["大招：凍結全敵2秒 CD15秒","大招：凍結全敵2秒 CD15秒","大招：凍結全敵2秒 CD15秒"],[s=>{s.hasTS=true;s.tsFrzDur=2e3;s.tsCd=15e3;g.ultCharge=0;g.ultCdEnd=0},s=>{s.hasTS=true;s.tsFrzDur=2e3;s.tsCd=15e3;g.ultCharge=0;g.ultCdEnd=0},s=>{s.hasTS=true;s.tsFrzDur=2e3;s.tsCd=15e3;g.ultCharge=0;g.ultCdEnd=0}],"#74C0FC",null,1);
// ═══ 劍士專屬卡 ═══
card("殘影斬","👻","SR","atk",["攻擊留殘影(50%傷害)","殘影傷害75%","殘影傷害100%"],[s=>{s._ghostSlash=.5},s=>{s._ghostSlash=.75},s=>{s._ghostSlash=1}],"#DA77F2");C[C.length-1].charReq="swordsman";
card("劍氣強化","🌊","R","atk",["劍氣每4次觸發","劍氣每3次+250%傷害","劍氣每2次+400%傷害"],[s=>{s._qiEvery=4;s._qiMul=2},s=>{s._qiEvery=3;s._qiMul=2.5},s=>{s._qiEvery=2;s._qiMul=4}],"#74C0FC");C[C.length-1].charReq="swordsman";
card("拔刀術","🩸","SR","atk",["範圍+30% 20%流血","範圍+50% 30%流血","範圍+80% 40%流血"],[s=>{s._drawSlash=1;s._bleedChance=.2},s=>{s._drawSlash=2;s._bleedChance=.3},s=>{s._drawSlash=3;s._bleedChance=.4}],"#FF6B6B");C[C.length-1].charReq="swordsman";
card("達摩的光劍","🔦","SSR","atk",["攻+15 揮劍射出3道光束","攻+15 揮劍射出3道光束","攻+15 揮劍射出3道光束"],[s=>{s.atk+=15;s._lightSaber=true},s=>{s.atk+=15;s._lightSaber=true},s=>{s.atk+=15;s._lightSaber=true}],"#FFD43B",null,1);C[C.length-1].charReq="swordsman";
// ═══ 坦克專屬卡 ═══
card("荊棘之盾","🌵","R","pas",["反彈75%實際傷害","反彈150%實際傷害","反彈300%實際傷害"],[s=>{s.thorns=(s.thorns||0)+.75},s=>{s.thorns=(s.thorns||0)+1.5},s=>{s.thorns=(s.thorns||0)+3}],"#51CF66");C[C.length-1].charReq="tank";
card("大地震擊","🌋","SR","atk",["盾擊+地震波(Boss最高80)","地震波傷害+50%","地震波傷害+100%"],[s=>{s._quake=1},s=>{s._quake=2},s=>{s._quake=3}],"#FF922B");C[C.length-1].charReq="tank";
card("鋼鐵意志","💪","R","pas",["<30%HP自動減傷30%+回血","<30%HP減傷40%+回血","<30%HP減傷50%+回血"],[s=>{s._ironWill=.3},s=>{s._ironWill=.4},s=>{s._ironWill=.5}],"#868E96");C[C.length-1].charReq="tank";
card("守護者光環","✨","SR","pas",["周圍減傷10%+自己5%","周圍減傷15%+自己10%","周圍減傷20%+自己15%"],[s=>{s._guardAura=1;s.armor=(s.armor||0)+.05},s=>{s._guardAura=2;s.armor=(s.armor||0)+.1},s=>{s._guardAura=3;s.armor=(s.armor||0)+.15}],"#FFD43B");C[C.length-1].charReq="tank";
card("萬物吞噬","🌀","SSR","atk",["攻+8 命中回0.5HP","攻+15 命中回1HP","攻+25 命中回2HP"],[s=>{s.atk+=8;s.bulletHeal=(s.bulletHeal||0)+.5},s=>{s.atk+=15;s.bulletHeal=(s.bulletHeal||0)+1},s=>{s.atk+=25;s.bulletHeal=(s.bulletHeal||0)+2}],"#845EF7");
card("創世神力","✨","SSR","atk",["攻+15 速+30% 暴+15%","攻+25 速+45% 暴+30% 閃避+6%","攻+40 速+60% 暴+45% HP+50 閃避+10%"],[s=>{s.atk+=15;s.fr*=.7;s.crit=(s.crit||.05)+.15;s.fx.star=Math.max(s.fx.star||0,2)},s=>{s.atk+=25;s.fr*=.55;s.crit=(s.crit||.05)+.3;s.dodge=Math.min(1,(s.dodge||0)+.06);s.fx.star=3},s=>{s.atk+=40;s.fr*=.4;s.crit=(s.crit||.05)+.45;s.dodge=Math.min(1,(s.dodge||0)+.1);s.maxHp+=50;s.hp=Math.min(s.hp+50,s.maxHp);s.fx.star=3}],"#FFD43B","star");




export function rndBuff(s){const buffs=[()=>s.atk+=rn(3,8)|0,()=>{s.maxHp+=rn(50,100)|0;s.hp=Math.min(s.hp+50,s.maxHp)},()=>s.dodge=Math.min(1,(s.dodge||0)+rn(.08,.15)),()=>s.fr*=rn(.8,.92),()=>s.crit=(s.crit||.05)+rn(.05,.15),()=>s.ls=(s.ls||0)+(rn(5,15)|0),()=>s.armor=1-(1-s.armor)*rn(.8,.92)];buffs[buffs.length*Math.random()|0]();}
