// Audio system — BGM + Web Audio SFX synthesis
let _actx = null;
let _sfxOn = true;
let _bgm = null;
let _muted = false;
let _lastShootSfx = 0;
let _lastHitSfx = 0;

export function setMuted(v) { _muted = v; }
export function getMuted() { return _muted; }

export function bgmPlay() {
  if (_bgm) return;
  _bgm = new Audio("./One_More_Credit.mp3");
  _bgm.loop = true; _bgm.volume = .35; _bgm.muted = _muted;
  _bgm.play().catch(() => {});
}
export function bgmStop() {
  if (_bgm) { _bgm.pause(); _bgm.currentTime = 0; _bgm = null; }
}
export function bgmRef() { return _bgm; }

// Visibility handler
document.addEventListener("visibilitychange", () => {
  if (!_bgm) return;
  if (document.hidden) { _bgm.pause(); }
  else { _bgm.play().catch(() => {}); }
});

export function sfxCtx() {
  if (!_actx) try { _actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  return _actx;
}
export function getActx() { return _actx; }

export function sfx(type) {
  if (!_sfxOn) return;
  const ac = sfxCtx(); if (!ac) return;
  const now = ac.currentTime;
  if(type==="shoot"){
    // 極短 square wave 下滑 — 輕快「噗」
    const o=ac.createOscillator(),g=ac.createGain();
    o.type="square";o.frequency.setValueAtTime(750+Math.random()*200,now);
    o.frequency.exponentialRampToValueAtTime(350+Math.random()*80,now+.025);
    g.gain.setValueAtTime(.07,now);g.gain.exponentialRampToValueAtTime(.001,now+.03);
    o.connect(g).connect(ac.destination);o.start(now);o.stop(now+.035);
  }else if(type==="hit"){
    // 三角波 + 短噪 — 清脆「啪」
    const o=ac.createOscillator(),g=ac.createGain();
    o.type="triangle";o.frequency.setValueAtTime(280+Math.random()*60,now);
    o.frequency.exponentialRampToValueAtTime(120,now+.04);
    g.gain.setValueAtTime(.1,now);g.gain.exponentialRampToValueAtTime(.001,now+.045);
    o.connect(g).connect(ac.destination);o.start(now);o.stop(now+.05);
    // noise burst
    const buf=ac.createBuffer(1,ac.sampleRate*.02|0,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.35;
    const ns=ac.createBufferSource(),ng=ac.createGain();
    ns.buffer=buf;ng.gain.setValueAtTime(.06,now);ng.gain.exponentialRampToValueAtTime(.001,now+.025);
    ns.connect(ng).connect(ac.destination);ns.start(now);
  }else if(type==="kill"){
    // 上行 sine sweep — 愉悅「叮～」
    const o=ac.createOscillator(),g=ac.createGain();
    o.type="sine";o.frequency.setValueAtTime(500+Math.random()*60,now);
    o.frequency.exponentialRampToValueAtTime(1300+Math.random()*200,now+.09);
    g.gain.setValueAtTime(.1,now);g.gain.setValueAtTime(.1,now+.04);
    g.gain.exponentialRampToValueAtTime(.001,now+.12);
    o.connect(g).connect(ac.destination);o.start(now);o.stop(now+.13);
  }else if(type==="hurt"){
    // 低頻 square + noise — 沉悶「咚」
    const o=ac.createOscillator(),g=ac.createGain();
    o.type="square";o.frequency.setValueAtTime(140+Math.random()*30,now);
    o.frequency.exponentialRampToValueAtTime(60,now+.06);
    g.gain.setValueAtTime(.12,now);g.gain.exponentialRampToValueAtTime(.001,now+.07);
    o.connect(g).connect(ac.destination);o.start(now);o.stop(now+.08);
    const buf=ac.createBuffer(1,ac.sampleRate*.04|0,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.4;
    const ns=ac.createBufferSource(),ng=ac.createGain();
    ns.buffer=buf;ng.gain.setValueAtTime(.08,now);ng.gain.exponentialRampToValueAtTime(.001,now+.045);
    ns.connect(ng).connect(ac.destination);ns.start(now);
  }else if(type==="levelup"){
    // 三音上行琶音 C-E-G — 「登登登！」
    [523,659,784].forEach((f,i)=>{
      const o=ac.createOscillator(),g=ac.createGain();
      o.type="sine";o.frequency.setValueAtTime(f,now+i*.08);
      g.gain.setValueAtTime(0,now+i*.08);g.gain.linearRampToValueAtTime(.12,now+i*.08+.01);
      g.gain.exponentialRampToValueAtTime(.001,now+i*.08+.15);
      o.connect(g).connect(ac.destination);o.start(now+i*.08);o.stop(now+i*.08+.16);
    });
  }else if(type==="chest"){
    // 神秘開箱音 — 上行 + 閃亮
    [440,554,659,880].forEach((f,i)=>{
      const o=ac.createOscillator(),g=ac.createGain();
      o.type="sine";o.frequency.setValueAtTime(f,now+i*.06);
      g.gain.setValueAtTime(0,now+i*.06);g.gain.linearRampToValueAtTime(.1,now+i*.06+.01);
      g.gain.exponentialRampToValueAtTime(.001,now+i*.06+.12);
      o.connect(g).connect(ac.destination);o.start(now+i*.06);o.stop(now+i*.06+.13);
    });
  }else if(type==="ult"){
    // 嗡轟 — 低頻震盪 + noise sweep
    const o=ac.createOscillator(),g=ac.createGain();
    o.type="sawtooth";o.frequency.setValueAtTime(80,now);
    o.frequency.exponentialRampToValueAtTime(200,now+.12);
    o.frequency.exponentialRampToValueAtTime(50,now+.25);
    g.gain.setValueAtTime(.13,now);g.gain.exponentialRampToValueAtTime(.001,now+.3);
    o.connect(g).connect(ac.destination);o.start(now);o.stop(now+.32);
    const buf=ac.createBuffer(1,ac.sampleRate*.2|0,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.5;
    const ns=ac.createBufferSource(),ng=ac.createGain();
    ns.buffer=buf;ng.gain.setValueAtTime(.06,now);ng.gain.exponentialRampToValueAtTime(.001,now+.22);
    ns.connect(ng).connect(ac.destination);ns.start(now);
  }else if(type==="boss"){
    // 低頻壓迫 — 「嗡——」
    const o=ac.createOscillator(),g=ac.createGain();
    o.type="sine";o.frequency.setValueAtTime(180,now);
    o.frequency.exponentialRampToValueAtTime(55,now+.35);
    g.gain.setValueAtTime(.14,now);g.gain.linearRampToValueAtTime(.14,now+.15);
    g.gain.exponentialRampToValueAtTime(.001,now+.4);
    o.connect(g).connect(ac.destination);o.start(now);o.stop(now+.42);
  }else if(type==="phoenix"){
    // 神聖復活 — 上行和弦 + 閃亮尾音
    [392,523,659,784,1047].forEach((f,i)=>{
      const o=ac.createOscillator(),g=ac.createGain();
      o.type=i<3?"sine":"triangle";o.frequency.setValueAtTime(f,now+i*.07);
      g.gain.setValueAtTime(0,now+i*.07);g.gain.linearRampToValueAtTime(.11,now+i*.07+.02);
      g.gain.exponentialRampToValueAtTime(.001,now+i*.07+.25);
      o.connect(g).connect(ac.destination);o.start(now+i*.07);o.stop(now+i*.07+.26);
    });
  }
}

export function sfxShoot() {
  const n = performance.now();
  if (n - _lastShootSfx < 45) return;
  _lastShootSfx = n; sfx("shoot");
}

export function sfxHit() {
  const n = performance.now();
  if (n - _lastHitSfx < 60) return;
  _lastHitSfx = n; sfx("hit");
}

// Toggle mute state for all audio systems
export function toggleMuteState() {
  _muted = !_muted;
  if (_bgm) { _bgm.muted = _muted; }
  if (_actx) {
    if (_muted) _actx.suspend().catch(() => {});
    else _actx.resume().catch(() => {});
  }
  return _muted;
}
