(function () {
  "use strict";

  var MOD_STATE = {
    extraFishAdded: false,
    hudReady: false,
    lastSaveAt: 0,
    loopStarted: false
  };

  var MOD_CONFIG = {
    money: 999999999,
    gems: 999999999,
    upgradeLevel: 55,
    infoButtonId: "tf-mod-info",
    infoPanelId: "tf-mod-panel",
    extraFish: [
      { name: "abyss_lantern", sprite: 42, price: 80000, min: 34, max: 38, rarity: 0.95, type: 1, scale: 0.92, anim: 1 },
      { name: "void_blade", sprite: 35, price: 95000, min: 35, max: 39, rarity: 0.75, type: 2, scale: 0.82, anim: 0 },
      { name: "trench_warden", sprite: 41, price: 125000, min: 36, max: 41, rarity: 0.5, type: 3, scale: 0.88, anim: 0 },
      { name: "glow_ribbon", sprite: 33, price: 150000, min: 38, max: 43, rarity: 1, type: 1, scale: 0.76, anim: 0 },
      { name: "molten_spine", sprite: 34, price: 185000, min: 39, max: 44, rarity: 0.55, type: 2, scale: 0.94, anim: 0 },
      { name: "dusk_hammer", sprite: 43, price: 230000, min: 41, max: 46, rarity: 0.22, type: 3, scale: 0.9, anim: 1 },
      { name: "midnight_crest", sprite: 14, price: 280000, min: 42, max: 47, rarity: 0.4, type: 2, scale: 0.9, anim: 0 },
      { name: "depth_reaper", sprite: 18, price: 340000, min: 44, max: 49, rarity: 0.28, type: 3, scale: 0.74, anim: 1 },
      { name: "storm_eel", sprite: 26, price: 410000, min: 46, max: 52, rarity: 0.9, type: 1, scale: 0.86, anim: 0 },
      { name: "crown_phantom", sprite: 31, price: 500000, min: 48, max: 54, rarity: 0.42, type: 2, scale: 1, anim: 0 },
      { name: "blackfin_titan", sprite: 42, price: 650000, min: 50, max: 58, rarity: 0.18, type: 3, scale: 1.02, anim: 0 },
      { name: "sunken_king", sprite: 43, price: 900000, min: 54, max: 64, rarity: 0.08, type: 3, scale: 1.08, anim: 1 }
    ]
  };

  function overwriteProperty(target, key, value) {
    if (typeof window._Iu === "function") {
      window._Iu(target, key, value);
      return;
    }
    target[key] = value;
  }

  function getProperty(target, key) {
    if (typeof window._Ou === "function") {
      return window._Ou(target, key);
    }
    return target[key];
  }

  function getGameState() {
    if (!window.global || !window.global._Dw) {
      return null;
    }
    return window.global._Dw;
  }

  function capCanvasScale() {
    if (typeof window.js_scale_canvas !== "function" || window.js_scale_canvas.__tfPatched) {
      return;
    }

    window.js_scale_canvas = function (baseWidth, baseHeight, targetWidth, targetHeight) {
      var aspect = baseWidth / baseHeight;
      var pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
      var backStoreRatio = (
        g_CurrentGraphics.webkitBackingStorePixelRatio ||
        g_CurrentGraphics.mozBackingStorePixelRatio ||
        g_CurrentGraphics.msBackingStorePixelRatio ||
        g_CurrentGraphics.oBackingStorePixelRatio ||
        g_CurrentGraphics.backingStorePixelRatio ||
        1
      );
      var pixelScale = pixelRatio / backStoreRatio;
      var scaledWidth = targetWidth * pixelScale;
      var scaledHeight = targetHeight * pixelScale;
      var posx = 0;
      var posy = 0;

      if ((scaledWidth / aspect) > scaledHeight) {
        var startWidth = scaledWidth;
        scaledWidth = scaledHeight * aspect;
        posx = Math.round(((startWidth - scaledWidth) / pixelScale) / 2);
        scaledWidth = Math.round(scaledWidth);
      } else {
        var startHeight = scaledHeight;
        scaledHeight = scaledWidth / aspect;
        posy = Math.round(((startHeight - scaledHeight) / pixelScale) / 2);
        scaledHeight = Math.round(scaledHeight);
      }

      var result = '{"w":' + scaledWidth + ',"h":' + scaledHeight + ',"x":' + posx + ',"y":' + posy + '}';
      eval("gml_Script_gmcallback_window_set_size(null,null,'" + result + "')");

      if (pixelScale !== 1) {
        canvas.style.width = (scaledWidth / pixelScale) + "px";
        canvas.style.height = (scaledHeight / pixelScale) + "px";
      } else {
        canvas.style.width = "";
        canvas.style.height = "";
      }

      if (typeof g_CurrentGraphics.scale === "function") {
        g_CurrentGraphics.scale(pixelScale, pixelScale);
      }
    };

    window.js_scale_canvas.__tfPatched = true;
  }

  function tuneCanvas() {
    var gameCanvas = document.getElementById("canvas");
    if (!gameCanvas) {
      return;
    }

    gameCanvas.style.imageRendering = "optimizeSpeed";
    gameCanvas.style.transform = "translateZ(0)";
    gameCanvas.style.contain = "layout size style paint";

    var ctx = gameCanvas.getContext && gameCanvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      if ("mozImageSmoothingEnabled" in ctx) {
        ctx.mozImageSmoothingEnabled = false;
      }
      if ("webkitImageSmoothingEnabled" in ctx) {
        ctx.webkitImageSmoothingEnabled = false;
      }
      if ("msImageSmoothingEnabled" in ctx) {
        ctx.msImageSmoothingEnabled = false;
      }
    }
  }

  function mountHud() {
    if (MOD_STATE.hudReady) {
      positionHud();
      return;
    }

    var style = document.createElement("style");
    style.textContent = [
      "#" + MOD_CONFIG.infoButtonId + "{position:absolute;z-index:20;border:0;border-radius:12px;padding:10px 14px;font:700 13px/1.1 Arial,sans-serif;letter-spacing:.08em;background:linear-gradient(180deg,#16c7a5,#0f8f77);color:#fff;box-shadow:0 10px 24px rgba(0,0,0,.28);cursor:pointer;}",
      "#" + MOD_CONFIG.infoButtonId + ":hover{filter:brightness(1.06);}",
      "#" + MOD_CONFIG.infoPanelId + "{position:absolute;z-index:21;min-width:220px;max-width:280px;padding:14px 16px;border-radius:16px;background:rgba(10,23,33,.94);color:#e9fbff;font:600 13px/1.45 Arial,sans-serif;box-shadow:0 16px 32px rgba(0,0,0,.35);backdrop-filter:blur(8px);}",
      "#" + MOD_CONFIG.infoPanelId + " h3{margin:0 0 8px;font:700 15px/1.2 Arial,sans-serif;letter-spacing:.06em;}",
      "#" + MOD_CONFIG.infoPanelId + " p{margin:6px 0;}"
    ].join("");
    document.head.appendChild(style);

    var button = document.createElement("button");
    button.id = MOD_CONFIG.infoButtonId;
    button.type = "button";
    button.textContent = "INFO";
    button.addEventListener("click", togglePanel);
    document.body.appendChild(button);

    MOD_STATE.hudReady = true;
    positionHud();
  }

  function positionHud() {
    var button = document.getElementById(MOD_CONFIG.infoButtonId);
    var gameCanvas = document.getElementById("canvas");
    if (!button || !gameCanvas) {
      return;
    }

    var rect = gameCanvas.getBoundingClientRect();
    var x = rect.left + Math.max(12, rect.width * 0.03);
    var y = rect.top + Math.max(120, rect.height * 0.35);

    button.style.left = Math.round(x) + "px";
    button.style.top = Math.round(y) + "px";

    var panel = document.getElementById(MOD_CONFIG.infoPanelId);
    if (panel) {
      panel.style.left = Math.round(x + 4) + "px";
      panel.style.top = Math.round(y + button.offsetHeight + 10) + "px";
    }
  }

  function togglePanel() {
    var panel = document.getElementById(MOD_CONFIG.infoPanelId);
    if (panel) {
      panel.remove();
      return;
    }

    panel = document.createElement("div");
    panel.id = MOD_CONFIG.infoPanelId;
    panel.innerHTML = [
      "<h3>BIG FISHING MOD</h3>",
      "<p>Infinite money and gems are forced on.</p>",
      "<p>All hooks and fish unlock states are forced on.</p>",
      "<p>Depth, fish count, and earnings upgrades are maxed.</p>",
      "<p>Extra abyss fish have been added below the original bottom range.</p>",
      "<p>Performance mode caps render scale to keep the HTML5 build lighter.</p>"
    ].join("");
    document.body.appendChild(panel);
    positionHud();
  }

  function fishExistsByName(gameState, name) {
    for (var i = 0; i < Number(gameState._dF || 0); i += 1) {
      var fish = gameState._eF[i];
      if (fish && getProperty(fish, "uniq_name") === name) {
        return true;
      }
    }
    return false;
  }

  function addExtraFish() {
    var gameState = getGameState();
    if (!gameState || typeof window._T9 !== "function") {
      return;
    }

    for (var i = 0; i < MOD_CONFIG.extraFish.length; i += 1) {
      var def = MOD_CONFIG.extraFish[i];
      if (fishExistsByName(gameState, def.name)) {
        continue;
      }

      var fish = window._T9(null, null, def.sprite, def.price, def.min, def.max, def.rarity, def.type, def.scale, def.anim);
      overwriteProperty(fish, "uniq_name", def.name);
      overwriteProperty(fish, "unlocked", 1);
      overwriteProperty(fish, "earning", 1);
    }

    MOD_STATE.extraFishAdded = true;
  }

  function unlockEverything() {
    var gameState = getGameState();
    if (!gameState) {
      return;
    }

    gameState._FG = Math.max(Number(gameState._FG || 0), MOD_CONFIG.money);
    gameState._1G = Math.max(Number(gameState._1G || 0), MOD_CONFIG.gems);
    gameState._Ew = Math.max(Number(gameState._Ew || 0), 999999);
    gameState._BG = Math.max(Number(gameState._BG || 0), MOD_CONFIG.upgradeLevel);
    gameState._CG = Math.max(Number(gameState._CG || 0), MOD_CONFIG.upgradeLevel);
    gameState._EG = Math.max(Number(gameState._EG || 0), MOD_CONFIG.upgradeLevel);

    if (typeof window._ra === "function") {
      window._ra(null, null);
    }

    for (var i = 0; i < Number(gameState._dF || 0); i += 1) {
      var fish = gameState._eF[i];
      if (fish) {
        overwriteProperty(fish, "unlocked", 1);
        overwriteProperty(fish, "earning", 1);
      }
    }

    for (var j = 0; j < Number(gameState._fF || 0); j += 1) {
      var hook = gameState._gF[j];
      if (hook) {
        overwriteProperty(hook, "unlocked", 1);
        gameState._wJ = j;
      }
    }

    if (typeof window._Ab === "function" && Date.now() - MOD_STATE.lastSaveAt > 1500) {
      window._Ab(null, null);
      MOD_STATE.lastSaveAt = Date.now();
    }
  }

  function modTick() {
    capCanvasScale();
    tuneCanvas();
    mountHud();
    addExtraFish();
    unlockEverything();
    positionHud();
  }

  function startModLoop() {
    if (MOD_STATE.loopStarted) {
      return;
    }

    MOD_STATE.loopStarted = true;
    modTick();
    window.setInterval(modTick, 500);
    window.addEventListener("resize", positionHud);
  }

  if (typeof window.GameMaker_Init === "function") {
    var originalInit = window.GameMaker_Init;
    window.GameMaker_Init = function () {
      startModLoop();
      return originalInit.apply(this, arguments);
    };
  } else {
    startModLoop();
  }
})();
