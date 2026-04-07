// Shared mutable state — all modules import S and use S.xxx
const S = {
  // --- dragon pet sprites ---
  _dpWingImg: null,
  _dpBodyImg: null,
  _dpW: 50, _dpH: 48, _dpJX: 27, _dpJY: 13,

  // --- viewport ---
  VW: 400, VH: 700,

  // --- mode / character ---
  _mode: "classic",
  _charType: "gunner",

  // --- card ID counter ---
  CID: 0,

  // --- FX quality ---
  fxQ: 1,

  // --- inventory ---
  inv: [],
  inv2: [],

  // --- canvas refs ---
  cv: null, cx: null, fxc: null, fxctx: null,

  // --- core game state ---
  g: null,
  joy: { a: 0, dx: 0, dy: 0, id: null, sx: null, sy: null },
  aim: { a: 0, dx: 0, dy: 0, id: null, sx: null, sy: null, tn: 0, lt: 0 },

  // --- hit effects ---
  _hitFlash: 0, _shakeT: 0, _shakePow: 0,

  // --- phoenix ---
  _phoenixT: 0,
  _phoenixAnim: null,

  // --- animation frame / timers ---
  raf: undefined, cTimer: undefined, ultCastTimer: null,

  // --- co-op networking ---
  _net: null,
  _isCoopMode: false,
  _p2AI: false,
  _clientSkillReq: false,
  _clientUltReq: false,
  _clientDodgeReq: false,
  _p2Input: { dx: 0, dy: 0, a: 0, aimA: 0, aimDx: 0, aimDy: 0, ult: false, dodge: false, pick: -1 },

  // --- audio ---
  _bgm: null,
  _muted: false,
  _actx: null,
  _sfxOn: true,
  _lastShootSfx: 0,
  _lastHitSfx: 0,

  // --- settings ---
  _settingsOpen: false,
  _wasRunning: false,

  // --- hints ---
  hintQueue: [],
  hintShowing: false,

  // --- particles ---
  par: [],
  _ltnRingIdx: 0,

  // --- title screen ---
  _titlePar: [],
  _titleSlash: 0,
  _titleSlashX: 0,
  _titleSlashFace: 1,
  _titleUltTimer: null,

  // --- skills ---
  _p2SkillCdEnd: 0,
  _skillCdEnd: 0,
  _dashGhosts: [],

  // --- card pick ---
  _currentPickCtx: null,

  // --- boss ---
  _stageBoss: null,
  _bossBgmInterval: null,

  // --- end cutscene ---
  _endCutsceneNodes: [],
  _endCutsceneRunning: false,

  // --- practice mode ---
  _practiceMode: false,
  _pracEnemySel: new Set(),
  _pracCardSel: new Set(),

  // --- p2 cards ---
  _p2BigChestLeft: 0,
};

// Initialize dragon sprites
S._dpWingImg = new Image();
S._dpBodyImg = new Image();
S._dpWingImg.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAwCAYAAABT9ym6AAAABmJLR0QA/wD/AP+gvaeTAAACsUlEQVRoge3VXWjNYRzA8e/vOWe2s5cmM2/L0ljsaihF8laUUGppRXkpLlyspnGBklpeLpRSyhXJBRlWciFxQaS8rGUyJbaMLPaec87+O/+Xn4v/2YzItM1Sz+fiXJzzf/7P8z3/5zwHLMuy/ifyuw+aqlff87p78gaSrqoxmWCMoC7gaeCjSoaYiGLEJ/BUJZqtbippotGI5OSru3bv5pXbt7dPeIjq84xPp2vPZTbf3p1yApIJJZmA/gSkBoJwpP7ihpkx8rZUrSyvOfVwnNf+47x/uqD17I6duY1XLop6Q0MEcF0hmVD603GOExCJCFM2Vx6df/hq7eD4V3V1k3qvHT+5/NqL/RMaAtB2pvJEzsvrh1BA00MkQFVRgc8fDH1dAbPLpzL7fEdURPzBsY8qFz3Wd43LPChc00DneIWYkVxUXF132C0o6QIFCcI9lQ7qaDfE42FQZHrRh+ERT/auu6rvGpcBROHAeEUw0hAAZ+bi0+Hzk/A5CnR3RkgmYN4CgxgBEwx940/3VRxJPbtXOewWVWO9+OFGHJK3seYSxqQjlL4ewelX5swF34esmBBNJUsAGg5tq3Ae3awNT4Oh3Ztza1NZ6YSHFJQu/egxCRGI9xncFBQVKyKKl4KsGJiu9/mvLxzbmrxff8MQgAgimj4ehILcrBUTHgKQGemf6yTkjipMnR6k3xU8D2IxQfDR+trL4jqAImj4mt6KTkvzwvHJ+MuQyedomXXZX5+d75ci3IXwd++5SlY2iMC0Qo9oxvfDUNJBghINBh6MfcLgPKPwZRelJmKOdLSzatoMKUYUVPF8ofWN4rnhP6YqGKEvN0VReROJsVr8cKMK+VnnHsoMrFA1SzSQjLZWJf41AKEn3svBDW8ZGMv5LMuyLMuyLMuyLMuyLMuyLMv6l74BpKIFeLuqkjYAAAAASUVORK5CYII=";
S._dpBodyImg.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAwCAYAAABT9ym6AAAABmJLR0QA/wD/AP+gvaeTAAAPzUlEQVRogcVaaXRVVZb+9rn3zS/zRCYgJJFAVGyMioooKmopKs7lAA6kLEqsUqkuKa1VXYjQ2iWIa5UTzWCXUmilwHZCBYlBBAmSBkEDQggZCAlk4CXv5Y132P3jvjEkBqle7VnrZr177jl77+/s4ex9ToCfsH31bw//rn7pvKt+ShnOqDVU/fvM43s3OiLv7gM7M7ZNsnLd7+74/U8r2Y9sJza/OqZ9XpHa9uLNi7m+3gwA224ta9xWQbx91iX/WLBggThT2vR/KulptPbVlQ9bvlq1PGTLCYkJN/3x6P5OT2Dre69KEiFtwtgjaaOzdoZsOTsKHl+2kqjQf7p0/9+BAMDRZy7dam/96jKAoGScpXkONkhpGTrABCICwFAdWaHQxJnXFj64ZMvp0DxjVf4zzXvVkzcoSQVuZoap+5CUngFQwpoSZG+X2fT1yur++g0jTofmoBrZ+84rs8Su9+cqnScQ9CnMQlgAIQisAFBZ18AMEwmJIUiDrjKTbGcl5BOyLJEjhZWr59w8ZebMjgjN/W8ty+3r68u9+NEFuwGgY/3CC6RPF38tNAUEAoNBKQLmSxwIbPKAVADECJVe8WbeUzX3nxEQAGCuM7W/uPA1y/5PZocCOnxehs8L+L1AKKgbM3kQghYbkm5/dMqEeS98Gemrq6pKCax6ookunj7j0gXLt0b6T7x04xJp74bfEhGYGeYrnLBPtcD9hgd6cxAAQU0r9AZyxi0XQkCwFhAETdVZDibl7y995I01EVrykAipQgFQ2fTyrC+de97+r1SLitR0AztBQFEIPi/DHwYXCOiQJEL69Jv+NDYORH1VlfnkW3/Yg+5jacnpWeZ4Hr7+QKfTWDUAQHCrB2pDEHpHKLrGJlebw+RunQc23rs6CCYL4JxQ8S6AKJBhfaTo0Tf/6j/3ludIGI5o2DLBZNaRnKoju0CH1Q4QA/nlGTjrqXcWx893rXtuC9obigAgcPKEL/6bzjY7woplAogJ+jEF0AlM4X4woBPABNYBuxOwWk81htNy9pGPVT2tZIzpARgg3WAdXSGB/n4GEyDl5B8lIi0yb+ecaX/nxj0XAwARoAkpwZT7DjXOYT28NDyIqUbAMKCBoJIMa5IMk12CqiXKftpRK5A78UVD24SwUnCyW4LPC5SUCZAgQOjdkfFfP37rH0O7Nt8ZeWcGBCjKr61mTYHl5Pc57a0cRpEIIAKOCCAiqBlj2qji1v9QSyZtCVbcXT3y2Z23DAuk8+PKTwf2Jd0w700IEeXQ5yIE/IzRxYCmAVYbQQ75xgDA/zx1z62Bbe8vNNYzpgST2eKM/HZ9tuYRYg3BIKO91YhaoKiiAQFQ+IHQYTl5uEDe84/55ua6y605xc8OlO8UZ2/77JkbkpqXXtveXmfPy6uI2nRG6aS2Ew/bYKIgPL0CSgjIH2mspBoiWG2A6GlJObB60d3dKxatFdDBZARWMIEBhFoOjAXwCQBIHQ0PEQhJKYCrm+HpYziSCbKZkDnl6pWKrkCCpmiQLSaZfcRMIdmhOibd+WL65FmtwwJJ6t34G0lzw/rtigcAvJqgPgH4+gjMQGaOHrUDVQVsNgJBA7+7cC0pofAXgCN2AkDrbLsfwEstn68t9y25LwcgCMFIywT63YT+Ph2UV+w5+6mNvxjMUoz20aC9CabV1NRktbi/nQYQRFftv8Z/O7K7epTqVSAJIDlVN3wChoOqChuRi4DsLBWyKWZOBI4+WsuB877/6wvnej56vTLyncNpSVIKkJFNcJaMeWNoEEO3BCDpR16olFQPwUyweuqLfG01BdGP+zZdhJwSr0hLNiKJHnZQYigKYLEYYhMxis6iBDDhbQICOrrWvrSBulsejg9RFPYlhkD2HY8sOxMgieHwbxOabL59o8VIQG9kuLJuXJZzx4fz4scwM3W9/8xt/OXq1yVXawZA6DxGyCngBKEJhO5OQk+XDk3jKCMiIC2TookBUVySkFfWM27lgcwzARLViL9920irp3400gCWANgISaGGU2yViDh7xoJ14pa/FKmZJUeJCJIsABbhkBNZaUJmto6x5YTx5wrIJgIRkJwqYLMTrHbAbDbg6RxegOxRfzkTEAlAfF8t+i1BA6UAnJwLyiTI7oPOo18uu2KwiVmTb/ZIN82bxkSQTUCiqcDYOKObASN/JGHsOYTcQh3JKYTkFEJaBpCdC6SkEyAEsh+cv+qfBmLzH34ISYBudYJzxwE2QzPOtnfnDjU5a/IjB5UR5zTKsiEsgxEKCrS3Eg59BxzeT1AVg4XdgWh6Y6ANb4RMsFoMQO51S5cw85CJ7LBAWmqeu1rub3RSOoGzSqALCXpKLiidYAkcuoWZh0wukZb3lsXKUGUne8pmLNTuWzMhOGHGXN2eGsgbBciyHrfLhXO1yE7OkXVkkM5Ibvj4rvZnp3x8xkAy+6ofZwvAVhM4KcvYwLJKQCmAFDghHdvw6L1DEdAKJ9ZTXlFP8ObFpUVP/vefCn92z76c237+TvF5Dp/NHmdeYU0wwg7BiJljnAlaW7Zd1/zCja8Mxmvnr6593nVgz+gdc6YtHviNmGvkwKrbg1KmS+jFZeD0QuOLDojWXaBmFxTTpF2OO3dcOBjxttr1BflZyR4qntYX6Tv2h/P2Wzq+GefqluDtN1KP3EKCnJsOqbQQIjsdZDVBDyrgrl5oDUfBxzsBZhARmCQ09ozer+rCzMxa0RgKHmvRyH+0+RzzmPJ2f2tD3pW1/gQTpGMfVM7Oal+1EiUC+tirEAuUDPL3Qmqsg9pkRu+0d7NzS6/vGk7FHSsq55prV70MAMdaCH0uQyvnLL0L5nwniAk8IEkULMCBIALVO6F/ewgA4O4VaGs2EuniMoHmRkAN6SAAGgnYJk5dfdGK6tlRGqmBvY+BAPgICLoNdYd9krxucB+B1CBsDWt/IG0wWlVVlSTqP1kKpth+EvFtiwTBAkr9YfhfX4e+wya0VX0DEfYTslpgu2EKrDNvAksSklN1SDIlpDgIG6MumZAy6Zo18bxlT8HtT+ip10qakIWlJztJvPVYlZ5f7lan3XUH94aYsiHsI2U1qCV1xxVkg7ZLPdUPSO52S3SHy0gF954EAfhu/nowEcqKFRB0yB+sQQoDwMQEGlJ+NuyVt8G3Yh3SMxldJwx/IgI4vCqSFoLri/eeBlATBTLikvnVkZfm95dOTQ6oUHrczryKpzYNp4GBjZq/nhfRgHzlhZDqXMDhk4ZLe4Nh/zZKARH0QlMIzX/bhdH3XpBAR6SnwHzTlUjf0qA7HltS5ocvpUDIIQqKgMmiqT5/yKyaLBLe3BHTSIJ6eg6PZAYkT4eoq1tuqqj4pXK6ILiqSuqsmT0eAHSHHc6LJoDraqJFEsOoWKMlHxGQnAnL9EoAewcQY5jLihDaultY8kd6CssvbBiOfwIQ7utIBgBJDaCoX64AsGPImQOat8wxXvq0HyDAMnkiGIySuVcAcxMTA9efV0HSDbWR5Eduyj7EZVvhZrybL/sXdH73yTgAx38UEIhYMty/fe1dPwZIT+2H45xhszKPLx5yXNqTswf0DChzJQugBQ06ZUWQvjh6Wgd0iaVuamo0QlhdRx76MemCSfOOAABdCMBi+oGRcWlK9Hdc/eLIiRtK4GSH9KOBWIqSPRGisqs5qfU/fznrdIEoiioAgEwy1OYO6G7vDwAAINvCPxI1wu7EKrZvT/3Mfcvm/wzhEmIo/gmmZc4f36aZAQQN+pb6j15paqr5e1HR1MBwQCS/yzj2CYYQfGeDIZTTAev0yyGPzktI72G2g6xpYHcbQAJsdgCaAlIHsmH4du+8Ru2uvmbLLeUHD36w+gIAnsH4J2jEFSj9TiqUovxM3g6H+c2nNw1nYq2Lr/nAdnCTcfTDFK1NyONH4O2PEdrzfYJwZE02QACAZIZILgbZB3eFUK/XqB1b6sd2Ll/0bVVV1aCmlgCkqHzqcSrP0+L7rK21lx1fNGXzUBnw0dWP3udorL7RkFGEUwI9nATqAAPBT7ZBc7ljUNwdMQK6CvZ3gpVesGwF27IB2bjU0vwqhBpOOImA402jCj5/4+lhgQAAMoo2ixHhai9sDebm7Vcef2K0q3nl3MqB2jE3fP5nhh453wxLSrEnLENgU23cLIpl9roK9LcDgV7A5AQ5RwNm41yge1dzeEePkVabvntsMCCnmMzR2gXXp594dkPgQwb0+BBvDNUcmbqakrdbMzkOyFabVz5YM0dAj8ut4g8djE4SDJ0ISfNnRwYBjnyANcDbYYRcWzYADayrgOIBFB/2/f49BJu7Y8U9MzQSuGJJtYmmTlXj5T7FXAonLfjYs7W823TR95lKLccVRUaTvN1C8nZXAFyRGEY5AcTA9RLMxpGkJIEZkGxZYF2B5jsGkkyGjwS6AF87wAxvswuB5p7YaWokG2DG4QKbHYA7nkPUtOJNxuO8cY4o1CGNFwkrO4wyEzSRMCdMmkggUvDqfY3QPc1GnxYE9x0E+44DOoOYcOilzYk0yTg0Es5ULi2d5B7IMwqEKFYk5E18fr2WdvVG03gN8kQaYqU59ncQoDRgrC5JYBGXioTcgOoHJZ8FsuUAITdIDYBAOLxiG5Tjp8hq0M0d9dlg/UOexu/23TMjaCk/IhdrsFwHIHUADI5oimM+HqeJ6K4RPriSzz4rTpqw70CATE5AdkTvEFvX70H35gMxPkTR9B1mm559w+w5gwIcCoghWI2154sn66yBunIA4G4BtYGgtevguCAdPUsYhCgRoJskOH9zL8g8MHUhsCSDoYJ0gbbPu7uOLV+XFQGVcEpmsbPjmp9ff/6CVafcFGC4+xGiqYGMy3edo+VVLmQ5Q6dMDaaLVVhvZdhvI9iuk6Ks4hMQ44rAKJp1kwT7/TMSQMTFNZCmQEPOEU677tLOzxtX00CjtNhBY87dlvvwn0rPX7Bq45Cy/hCQ+NbZWeNUD772uIOO3E+BlhJSXCA/EPhQj5pF1KgI0E0mmM4uhfXKC0HmSHCMjJOhsNNDppQNJ7x5L5ec/cB2ANgx68LnQ/W75seLp1FsiYgAjYHxr9c68ioqEq7xhj6vGtCys6f2A1gUfsB8MmX/uren93w7dw1FNqzoqQ9BhwqzlvkNzr/zqpycTM1sDoVMJx2i1+IRZWWTB82XWFEGRA2GlBD9DBM69Osp/bWP31Y56aX1qyOfzvx/Pyi9T3i8bSCCDhHdNBlSuMZmqHu3nGfZvvHS4uKKvsLCS/wjJkzwDgUCAHSr06JJZmiy8ehy7LcmmZHz5Gu/Uk02JE1/8Ne+w/tei5972hoZrIU0VUfOKM028epfBLZ/sEpkFRwRqelfKA37HrKcPWmp2t50t9rTFbluG+JmPtYmv/HlPADzhhxw1xwAeB21rwBAwiHe/wJC0p5PcGG+dQAAAABJRU5ErkJggg==";

export default S;
