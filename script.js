(function () {
  "use strict";

  const STORAGE_KEY = "function-forge-save-v3";
  const NEG_INF = Number.NEGATIVE_INFINITY;
  const MIN_POSITIVE = 1e-12;
  const FUNCTION_COST_A = 0.22;
  const FUNCTION_COST_B = 0.045;
  const LOG10_E = Math.LOG10E;

  const RUN_UPGRADES = [
    {
      id: "lens",
      title: "Lens",
      description: "+25% gain this run.",
      costLog(state) {
        return 0.9 + state.runUpgrades.lens * 1.08 + state.functionIndex * 0.05;
      },
      effectText(state) {
        return "x" + shortPlain(Math.pow(0.25, state.runUpgrades.lens));
      }
    },
    {
      id: "memory",
      title: "Memory",
      description: "+1.2 x this run.",
      costLog(state) {
        return 1.4 + state.runUpgrades.memory * 1.24;
      },
      effectText(state) {
        return "+" + shortPlain(state.runUpgrades.memory * 1.2);
      }
    },
    {
      id: "compressor",
      title: "Compressor",
      description: "-5% function costs this run.",
      costLog(state) {
        return 2.3 + state.runUpgrades.compressor * 1.4;
      },
      effectText(state) {
        return "-" + shortPlain(getRunCompressionDiscount(state) * 100) + "%";
      }
    },
    {
      id: "autoClicker",
      title: "Auto-clicker",
      description: "Adds automatic clicks.",
      costLog(state) {
        return 3.2 + state.runUpgrades.autoClicker * 1.5;
      },
      effectText(state) {
        return shortPlain(getAutoClicksPerSecond(state)) + "/sec";
      }
    }
  ];

  const PRESTIGE_UPGRADES = [
    {
      id: "archive",
      title: "Archive",
      description: "+25% all gain.",
      max: Infinity,
      cost(level) {
        return 1 + level;
      },
      effectText(level) {
        return "x" + shortPlain(Math.pow(1.25, level));
      }
    },
    {
      id: "automation",
      title: "Automation",
      description: "Unlocks Auto-clicker.",
      max: 1,
      cost() {
        return 2;
      },
      effectText(level) {
        return level > 0 ? "on" : "off";
      }
    },
    {
      id: "hybrid",
      title: "Hybrid",
      description: "Adds hybrid gain. 3 ranks.",
      max: 3,
      cost(level) {
        return [3, 6, 10][level] || 10;
      },
      effectText(level) {
        return String(level);
      }
    },
    {
      id: "focus",
      title: "Focus",
      description: "Unlocks focus buttons.",
      max: 1,
      cost() {
        return 4;
      },
      effectText(level) {
        return level > 0 ? "on" : "off";
      }
    },
    {
      id: "autoTheory",
      title: "Auto theory",
      description: "+45% automation.",
      max: Infinity,
      cost(level) {
        return 5 + level * 3;
      },
      effectText(level) {
        return "x" + shortPlain(Math.pow(1.45, level));
      }
    }
  ];

  const FOCUS_OPTIONS = [
    { id: "balanced", title: "Balanced" },
    { id: "analytic", title: "Analytic" },
    { id: "algebraic", title: "Algebraic" },
    { id: "transcendent", title: "Transcendent" }
  ];

  const FUNCTIONS = buildFunctions();

  const dom = {
    totalClicks: document.getElementById("total-clicks"),
    gainPerClick: document.getElementById("gain-per-click"),
    functionValue: document.getElementById("function-value"),
    derivativeValue: document.getElementById("derivative-value"),
    progressionX: document.getElementById("progression-x"),
    currentFunctionName: document.getElementById("current-function-name"),
    nextFunctionCost: document.getElementById("next-function-cost"),
    insightCount: document.getElementById("insight-count"),
    autoRate: document.getElementById("auto-rate"),
    highestRun: document.getElementById("highest-run"),
    clickCore: document.getElementById("click-core"),
    upgradeFunctionButton: document.getElementById("upgrade-function-btn"),
    prestigeButton: document.getElementById("prestige-btn"),
    statusLine: document.getElementById("status-line"),
    nextFunctionName: document.getElementById("next-function-name"),
    hybridFormula: document.getElementById("hybrid-formula"),
    focusName: document.getElementById("focus-name"),
    prestigePreview: document.getElementById("prestige-preview"),
    timeToUpgrade: document.getElementById("time-to-upgrade"),
    lifetimeClicks: document.getElementById("lifetime-clicks"),
    manualClicks: document.getElementById("manual-clicks"),
    functionList: document.getElementById("function-list"),
    runUpgrades: document.getElementById("run-upgrades"),
    prestigeCards: document.getElementById("prestige-cards"),
    focusButtons: document.getElementById("focus-buttons")
  };

  const state = loadState();
  let keyboardSelectionId = "click-core";
  applyOfflineProgress(state);
  bindEvents();
  render();

  let lastFrame = performance.now();
  let autosaveAccumulator = 0;
  let rafId = requestAnimationFrame(loop);

  function buildFunctions() {
    const list = [
      directFunction("log(log(x+3))", "analytic", (x) => 0.35 + 0.45 * Math.pow(x,(x))),
      directFunction("log(x+1)", "analytic", (x) => 0.8 + 0.8 * x*x),
      directFunction("sqrt(log(x+1))", "analytic", (x) => 1.1 + 0.95 * Math.sqrt(Math.log(x + 1.6))),
      directFunction("log(x+1)^2", "analytic", (x) => 1.4 + 0.62 * Math.pow(Math.log(x + 1.8), 2)),
      directFunction("x^0.2", "algebraic", (x) => 1.7 + 0.72 * Math.pow(x, 0.2)),
      directFunction("x^0.33", "algebraic", (x) => 1.95 + 0.78 * Math.pow(x, 1 / 3)),
      directFunction("x^0.5", "algebraic", (x) => 2.35 + 0.86 * Math.sqrt(x)),
      directFunction("x^0.66", "algebraic", (x) => 2.8 + 0.86 * Math.pow(x, 0.66)),
      directFunction("x^0.75", "algebraic", (x) => 3.2 + 0.88 * Math.pow(x, 0.75)),
      directFunction("x^0.9", "algebraic", (x) => 3.8 + 0.84 * Math.pow(x, 0.9)),
      directFunction("x", "algebraic", (x) => 4.8 + 0.92 * x),
      directFunction("x^1.1", "algebraic", (x) => 5.4 + 0.9 * Math.pow(x, 1.1)),
      directFunction("x^1.25", "algebraic", (x) => 6.3 + 0.82 * Math.pow(x, 1.25)),
      directFunction("x^1.5", "algebraic", (x) => 8 + 0.72 * Math.pow(x, 1.5)),
      directFunction("x^1.75", "algebraic", (x) => 10 + 0.62 * Math.pow(x, 1.75)),
      directFunction("x^2", "algebraic", (x) => 14 + 0.54 * Math.pow(x, 2)),
      directFunction("x^2.5", "algebraic", (x) => 22 + 0.32 * Math.pow(x, 2.5)),
      directFunction("x^3", "algebraic", (x) => 32 + 0.18 * Math.pow(x, 3)),
      directFunction("x^3.5", "algebraic", (x) => 52 + 0.085 * Math.pow(x, 3.5)),
      directFunction("x^4", "algebraic", (x) => 86 + 0.04 * Math.pow(x, 4)),
      directFunction("x^5", "algebraic", (x) => 160 + 0.01 * Math.pow(x, 5)),
      directFunction("x^6", "algebraic", (x) => 280 + 0.0028 * Math.pow(x, 6)),
      directFunction("x^7", "algebraic", (x) => 420 + 0.00082 * Math.pow(x, 7)),
      directFunction("x^8", "algebraic", (x) => 680 + 0.00024 * Math.pow(x, 8)),
      directFunction("x^10", "algebraic", (x) => 1200 + 0.00002 * Math.pow(x, 10)),
      logFunction("1.25^x", "transcendent", (x) => 1.0 + (x / 3.0) * Math.log10(1.25)),
      logFunction("1.5^x", "transcendent", (x) => 1.15 + (x / 2.6) * Math.log10(1.5)),
      logFunction("2^x", "transcendent", (x) => 1.35 + (x / 2.2) * Math.log10(2)),
      logFunction("3^x", "transcendent", (x) => 1.55 + (x / 2.0) * Math.log10(3)),
      logFunction("e^x", "transcendent", (x) => 1.8 + (x / 1.9) * LOG10_E),
      logFunction("5^x", "transcendent", (x) => 2.05 + (x / 1.8) * Math.log10(5)),
      logFunction("10^x", "transcendent", (x) => 2.35 + x / 1.7),
      logFunction("2^(x^1.5)", "transcendent", (x) => 2.65 + Math.pow(x, 1.5) * Math.log10(2) / 3.4),
      logFunction("e^(x^1.5)", "transcendent", (x) => 2.95 + Math.pow(x, 1.5) * LOG10_E / 3.0),
      logFunction("10^(x^1.5)", "transcendent", (x) => 3.25 + Math.pow(x, 1.5) / 4.7),
      logFunction("x^x", "super", (x) => 3.6 + 0.62 * x * Math.log10(x)),
      logFunction("x^(1.25x)", "super", (x) => 3.95 + 0.78 * x * Math.log10(x)),
      logFunction("x^(1.5x)", "super", (x) => 4.3 + 0.92 * x * Math.log10(x)),
      logFunction("Gamma(x+1)", "super", (x) => 4.6 + 0.82 * stirlingLog10(x + 1.2)),
      logFunction("x!", "super", (x) => 4.95 + 0.94 * stirlingLog10(x + 1.6)),
      logFunction("x^(x^1.1)", "super", (x) => 5.3 + 0.16 * Math.pow(x, 1.1) * Math.log10(x)),
      logFunction("e^(x^2)", "super", (x) => 5.7 + x * x * LOG10_E / 3.8),
      logFunction("10^(x^2)", "super", (x) => 6.1 + x * x / 5.5),
      logFunction("2^(x^2.5)", "super", (x) => 6.55 + Math.pow(x, 2.5) * Math.log10(2) / 8.2),
      logFunction("e^(x^3)", "super", (x) => 7.0 + Math.pow(x, 3) * LOG10_E / 15),
      logFunction("10^(x^3)", "super", (x) => 7.45 + Math.pow(x, 3) / 22),
      logFunction("e^(e^(x/6))", "super", (x) => 7.9 + 1.8 * Math.exp(x / 8)),
      logFunction("x^^2", "super", (x) => 8.35 + 4.2 * x * Math.log10(x)),
      logFunction("10^(10^(x/9))", "super", (x) => 8.8 + Math.pow(10, x / 10) / 4),
      logFunction("x^^3", "super", (x) => 9.4 + Math.pow(10, 0.16 * x * Math.log10(x)) / 6)
    ];

    return list.map((spec, index) => ({
      ...spec,
      tier: index + 1,
      costLog: index === 0 ? NEG_INF : 0.16 + FUNCTION_COST_A * index + FUNCTION_COST_B * index * index
    }));
  }

  function directFunction(label, family, valueFn) {
    return {
      label,
      family,
      logValue(x) {
        return Math.log10(Math.max(MIN_POSITIVE, valueFn(x)));
      }
    };
  }

  function logFunction(label, family, logFn) {
    return {
      label,
      family,
      logValue(x) {
        return Math.max(-12, logFn(x));
      }
    };
  }

  function createDefaultState() {
    return {
      version: 3,
      totalLog: NEG_INF,
      lifetimeLog: NEG_INF,
      highestRunLog: NEG_INF,
      functionIndex: 0,
      bestFunctionIndexRun: 0,
      bestFunctionIndexEver: 0,
      manualClicks: 0,
      progressUnits: 0,
      rebirths: 0,
      insight: 0,
      focus: "balanced",
      prestigeUpgrades: {
        archive: 0,
        automation: 0,
        hybrid: 0,
        focus: 0,
        autoTheory: 0
      },
      runUpgrades: {
        lens: 0,
        memory: 0,
        compressor: 0,
        autoClicker: 0
      },
      statusLine: "Ready.",
      lastUpdated: Date.now()
    };
  }

  function hydrateState(parsed) {
    const base = createDefaultState();
    const next = {
      ...base,
      ...parsed,
      prestigeUpgrades: { ...base.prestigeUpgrades, ...(parsed.prestigeUpgrades || {}) },
      runUpgrades: { ...base.runUpgrades, ...(parsed.runUpgrades || {}) }
    };
    next.focus = hasFocusUnlocked(next) ? next.focus || "balanced" : "balanced";
    return next;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return createDefaultState();
      }
      return hydrateState(JSON.parse(raw));
    } catch (error) {
      console.warn("Failed to load save.", error);
      return createDefaultState();
    }
  }

  function saveState() {
    state.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function applyOfflineProgress(current) {
    const now = Date.now();
    const elapsedMs = Math.min(Math.max(0, now - (current.lastUpdated || now)), 8 * 60 * 60 * 1000);
    if (elapsedMs < 2000 || getAutoClicksPerSecond(current) <= 0) {
      current.lastUpdated = now;
      return;
    }
    runAutoGeneration(current, elapsedMs / 1000);
    current.statusLine = "Offline gain applied.";
    current.lastUpdated = now;
  }

  function bindEvents() {
    dom.clickCore.addEventListener("click", manualClick);
    dom.upgradeFunctionButton.addEventListener("click", buyNextFunction);
    dom.prestigeButton.addEventListener("click", performRebirth);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeunload", saveState);
  }

  function onKeyDown(event) {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === " " || key === "spacebar") {
      event.preventDefault();
      manualClick();
      return;
    }
    if (key === "u") {
      event.preventDefault();
      buyNextFunction();
      return;
    }
    if (key === "b" || key === "p") {
      event.preventDefault();
      performRebirth();
      return;
    }
    if (key === "enter") {
      event.preventDefault();
      activateKeyboardSelection();
      return;
    }
    if (key === "arrowdown") {
      event.preventDefault();
      moveKeyboardSelection(1);
      return;
    }
    if (key === "arrowup") {
      event.preventDefault();
      moveKeyboardSelection(-1);
      return;
    }
  }

  function loop(now) {
    const deltaMs = Math.min(100, Math.max(0, now - lastFrame));
    lastFrame = now;
    step(deltaMs);
    render();
    rafId = requestAnimationFrame(loop);
  }

  function step(deltaMs) {
    const dt = deltaMs / 1000;
    autosaveAccumulator += dt;
    runAutoGeneration(state, dt);
    if (autosaveAccumulator >= 5) {
      autosaveAccumulator = 0;
      saveState();
    }
  }

  function manualClick() {
    state.manualClicks += 1;
    state.progressUnits += 1;
    addCurrency(getCurrentGainLog(state));
    state.statusLine = "Clicked.";
    render();
  }

  function addCurrency(gainLog) {
    state.totalLog = logAdd(state.totalLog, gainLog);
    state.lifetimeLog = logAdd(state.lifetimeLog, gainLog);
    state.highestRunLog = Math.max(state.highestRunLog, state.totalLog);
  }

  function spendCurrency(costLog) {
    state.totalLog = logSubtract(state.totalLog, costLog);
  }

  function runAutoGeneration(current, dt) {
    const rate = getAutoClicksPerSecond(current);
    if (rate <= 0 || dt <= 0) {
      return;
    }
    current.progressUnits += rate * dt * 0.35;
    addCurrency(logMultiply(getCurrentGainLog(current), rate * dt));
  }

  function buyNextFunction() {
    if (state.functionIndex >= FUNCTIONS.length - 1) {
      state.statusLine = "Last function reached.";
      render();
      return;
    }
    const nextIndex = state.functionIndex + 1;
    const costLog = getFunctionCostLog(state, nextIndex);
    if (!canAfford(costLog)) {
      state.statusLine = "Need " + formatLogAmount(logSubtract(costLog, state.totalLog)) + " more.";
      render();
      return;
    }
    spendCurrency(costLog);
    state.functionIndex = nextIndex;
    state.bestFunctionIndexRun = Math.max(state.bestFunctionIndexRun, nextIndex);
    state.bestFunctionIndexEver = Math.max(state.bestFunctionIndexEver, nextIndex);
    state.statusLine = "Bought " + FUNCTIONS[nextIndex].label + ".";
    render();
  }

  function buyRunUpgrade(id) {
    const config = RUN_UPGRADES.find((entry) => entry.id === id);
    if (!config) {
      return;
    }
    if (id === "autoClicker" && !hasAutomationUnlocked(state)) {
      state.statusLine = "Automation is locked.";
      render();
      return;
    }
    const costLog = config.costLog(state);
    if (!canAfford(costLog)) {
      state.statusLine = "Need " + formatLogAmount(logSubtract(costLog, state.totalLog)) + " more.";
      render();
      return;
    }
    spendCurrency(costLog);
    state.runUpgrades[id] += 1;
    state.statusLine = "Bought " + config.title + ".";
    render();
  }

  function buyPrestigeUpgrade(id) {
    const config = PRESTIGE_UPGRADES.find((entry) => entry.id === id);
    if (!config) {
      return;
    }
    const level = state.prestigeUpgrades[id];
    if (level >= config.max) {
      state.statusLine = config.title + " is maxed.";
      render();
      return;
    }
    const cost = config.cost(level);
    if (state.insight < cost) {
      state.statusLine = "Need " + cost + " insight.";
      render();
      return;
    }
    state.insight -= cost;
    state.prestigeUpgrades[id] += 1;
    if (!hasFocusUnlocked(state)) {
      state.focus = "balanced";
    }
    state.statusLine = "Bought " + config.title + ".";
    render();
  }

  function performRebirth() {
    const reward = getRebirthReward(state);
    if (reward <= 0) {
      state.statusLine = "Rebirth not ready.";
      render();
      return;
    }
    state.insight += reward;
    state.rebirths += 1;
    state.totalLog = NEG_INF;
    state.highestRunLog = NEG_INF;
    state.functionIndex = 0;
    state.bestFunctionIndexRun = 0;
    state.manualClicks = 0;
    state.progressUnits = 0;
    state.runUpgrades = {
      lens: 0,
      memory: 0,
      compressor: 0,
      autoClicker: 0
    };
    state.focus = hasFocusUnlocked(state) ? state.focus : "balanced";
    state.statusLine = "Rebirth complete.";
    render();
  }

  function setFocus(id) {
    if (!hasFocusUnlocked(state)) {
      state.statusLine = "Focus is locked.";
      render();
      return;
    }
    state.focus = id;
    state.statusLine = "Focus set to " + getFocusById(id).title + ".";
    render();
  }

  function canAfford(costLog) {
    return state.totalLog >= costLog || Math.abs(state.totalLog - costLog) < 1e-10;
  }

  function getProgressX(current) {
    let x =
      2 +
      Math.pow(current.progressUnits + 1, 0.52) +
      current.functionIndex * 0.55 +
      current.runUpgrades.memory * 1.2 +
      current.rebirths * 2.4 +
      current.prestigeUpgrades.hybrid * 1.5;
    if (current.focus === "analytic") {
      x += 0.5;
    } else if (current.focus === "algebraic") {
      x += 0.9;
    } else if (current.focus === "transcendent") {
      x += 0.35;
    }
    return x;
  }

  function getCurrentFunctionLogs(current) {
    const spec = FUNCTIONS[current.functionIndex];
    const x = getProgressX(current);
    const valueLog = spec.logValue(x);
    const derivativeLog = getDerivativeLog(spec, x);
    return { valueLog, derivativeLog };
  }

  function getCurrentGainLog(current) {
    const { valueLog, derivativeLog } = getCurrentFunctionLogs(current);
    let gainLog = logAdd(valueLog, derivativeLog);
    const hybridLog = getHybridGainLog(current, getProgressX(current));
    gainLog = logAdd(gainLog, hybridLog);
    gainLog += Math.log10(getGlobalMultiplier(current));
    gainLog += Math.log10(getFocusMultiplier(current, FUNCTIONS[current.functionIndex].family));
    return gainLog;
  }

  function getCurrentFunctionValueLog(current) {
    const { valueLog } = getCurrentFunctionLogs(current);
    return applyExternalMultipliers(current, valueLog);
  }

  function getCurrentDerivativeValueLog(current) {
    const { derivativeLog } = getCurrentFunctionLogs(current);
    return applyExternalMultipliers(current, derivativeLog);
  }

  function getNextManualGainLog(current) {
    const preview = cloneState(current);
    preview.manualClicks += 1;
    preview.progressUnits += 1;
    return getCurrentGainLog(preview);
  }

  function applyExternalMultipliers(current, baseLog) {
    let result = baseLog;
    result += Math.log10(getGlobalMultiplier(current));
    result += Math.log10(getFocusMultiplier(current, FUNCTIONS[current.functionIndex].family));
    return result;
  }

  function getDerivativeLog(spec, x) {
    const center = spec.logValue(x);
    const h = Math.max(0.002, x * 0.0025);
    const leftX = Math.max(1.001, x - h);
    const rightX = x + h;
    const slope = Math.max(MIN_POSITIVE, (spec.logValue(rightX) - spec.logValue(leftX)) / (rightX - leftX));
    return center + Math.log10(Math.LN10 * slope);
  }

  function getHybridGainLog(current, x) {
    const level = current.prestigeUpgrades.hybrid;
    if (level <= 0) {
      return NEG_INF;
    }
    let spec;
    if (level === 1) {
      spec = directFunction("x^2+log(x)", "analytic", (input) => 2 + 0.08 * input * input + Math.log(input + 1));
    } else if (level === 2) {
      spec = directFunction("x^3+sqrt(log(x+1))", "analytic", (input) => 4 + 0.012 * Math.pow(input, 3) + Math.sqrt(Math.log(input + 1.5)));
    } else {
      spec = directFunction("e^(sqrt(x))+x^2", "transcendent", (input) => 8 + Math.exp(Math.sqrt(input) / 1.9) + 0.12 * input * input);
    }
    return logAdd(spec.logValue(x), getDerivativeLog(spec, x));
  }

  function getHybridLabel(level) {
    if (level === 1) {
      return "x^2+log(x)";
    }
    if (level === 2) {
      return "x^3+sqrt(log(x+1))";
    }
    if (level >= 3) {
      return "e^(sqrt(x))+x^2";
    }
    return "Off";
  }

  function getGlobalMultiplier(current) {
    return Math.pow(1.25, current.prestigeUpgrades.archive) * Math.pow(1.25, current.runUpgrades.lens) * (1 + current.rebirths * 0.06);
  }

  function getFocusMultiplier(current, family) {
    if (current.focus === "analytic") {
      return family === "analytic" ? 1.35 : 1.02;
    }
    if (current.focus === "algebraic") {
      return family === "algebraic" ? 1.35 : 1.02;
    }
    if (current.focus === "transcendent") {
      return family === "transcendent" || family === "super" ? 1.45 : 1.02;
    }
    return 1.1;
  }

  function getRunCompressionDiscount(current) {
    return Math.min(0.5, current.runUpgrades.compressor * 0.05);
  }

  function getFunctionCostLog(current, index) {
    let costLog = FUNCTIONS[index].costLog;
    let multiplier = 1 - getRunCompressionDiscount(current);
    if (current.focus === "analytic") {
      multiplier *= 0.92;
    } else if (current.focus === "algebraic" && FUNCTIONS[index].family === "algebraic") {
      multiplier *= 0.95;
    } else if ((current.focus === "transcendent") && (FUNCTIONS[index].family === "transcendent" || FUNCTIONS[index].family === "super")) {
      multiplier *= 0.95;
    }
    multiplier *= 1 - Math.min(0.22, current.prestigeUpgrades.archive * 0.012);
    return costLog + Math.log10(multiplier);
  }

  function getAutoClicksPerSecond(current) {
    if (!hasAutomationUnlocked(current)) {
      return 0;
    }
    let rate = current.runUpgrades.autoClicker * 0.8;
    rate *= Math.pow(1.45, current.prestigeUpgrades.autoTheory);
    if (current.focus === "transcendent") {
      rate *= 1.18;
    }
    return rate;
  }

  function getAutoGenerationLogPerSecond(current) {
    const rate = getAutoClicksPerSecond(current);
    if (rate <= 0) {
      return NEG_INF;
    }
    return getCurrentGainLog(current) + Math.log10(rate);
  }

  function getRebirthReward(current) {
    const fromClicks = Math.max(0, current.highestRunLog - 3.1) / 1.35;
    const fromFunction = Math.max(0, current.bestFunctionIndexRun - 5) * 0.9;
    return Math.max(0, Math.floor(fromClicks + fromFunction));
  }

  function hasAutomationUnlocked(current) {
    return current.prestigeUpgrades.automation > 0;
  }

  function hasFocusUnlocked(current) {
    return current.prestigeUpgrades.focus > 0;
  }

  function getFocusById(id) {
    return FOCUS_OPTIONS.find((option) => option.id === id) || FOCUS_OPTIONS[0];
  }

  function render() {
    renderStats();
    renderFunctions();
    renderRunUpgrades();
    renderPrestige();
    renderFocus();
    renderKeyboardSelection();
  }

  function renderStats() {
    const currentFunction = FUNCTIONS[state.functionIndex];
    const nextFunction = FUNCTIONS[state.functionIndex + 1];
    const valueLog = getCurrentFunctionValueLog(state);
    const derivativeLog = getCurrentDerivativeValueLog(state);
    const nextCostLog = nextFunction ? getFunctionCostLog(state, state.functionIndex + 1) : NEG_INF;

    dom.totalClicks.textContent = formatLogAmount(state.totalLog);
    dom.gainPerClick.textContent = formatLogAmount(getCurrentGainLog(state));
    dom.functionValue.textContent = formatLogAmount(valueLog);
    dom.derivativeValue.textContent = formatLogAmount(derivativeLog);
    dom.progressionX.textContent = shortPlain(getProgressX(state));
    dom.currentFunctionName.textContent = currentFunction.label;
    dom.nextFunctionCost.textContent = nextFunction ? formatLogAmount(nextCostLog) : "done";
    dom.insightCount.textContent = String(state.insight);
    dom.autoRate.textContent = shortPlain(getAutoClicksPerSecond(state));
    dom.highestRun.textContent = formatLogAmount(state.highestRunLog);
    dom.statusLine.textContent = state.statusLine;
    dom.nextFunctionName.textContent = nextFunction ? nextFunction.label : "done";
    dom.hybridFormula.textContent = getHybridLabel(state.prestigeUpgrades.hybrid);
    dom.focusName.textContent = getFocusById(state.focus).title;
    dom.prestigePreview.textContent = String(getRebirthReward(state));
    dom.timeToUpgrade.textContent = formatEta(getAutoEtaSeconds(nextCostLog));
    dom.lifetimeClicks.textContent = formatLogAmount(state.lifetimeLog);
    dom.manualClicks.textContent = state.manualClicks.toLocaleString();
    dom.upgradeFunctionButton.disabled = !nextFunction || !canAfford(nextCostLog);
    dom.prestigeButton.disabled = getRebirthReward(state) <= 0;
    dom.prestigeButton.textContent = getRebirthReward(state) > 0 ? "Rebirth +" + getRebirthReward(state) : "Rebirth";
  }

  function renderFunctions() {
    const start = state.functionIndex;
    const end = Math.min(FUNCTIONS.length, start + 8);
    dom.functionList.innerHTML = FUNCTIONS.slice(start, end).map((spec, offset) => {
      const absoluteIndex = start + offset;
      const costText =
        absoluteIndex === state.functionIndex
          ? "current"
          : "cost " + formatLogAmount(getFunctionCostLog(state, absoluteIndex));
      return (
        '<div class="upgrade-card">' +
        '<div class="card-title">' + spec.label + "</div>" +
        '<div class="card-meta">' + costText + "</div>" +
        "</div>"
      );
    }).join("");
  }

  function renderRunUpgrades() {
    dom.runUpgrades.innerHTML = RUN_UPGRADES.map((upgrade) => {
      const costLog = upgrade.costLog(state);
      const disabled = upgrade.id === "autoClicker" ? (!hasAutomationUnlocked(state) || !canAfford(costLog)) : !canAfford(costLog);
      return (
        '<div class="upgrade-card">' +
        '<div class="card-title">' + upgrade.title + "</div>" +
        '<div class="card-meta">' + upgrade.description + " " + upgrade.effectText(state) + "</div>" +
        '<button class="upgrade-button" type="button" data-id="' + upgrade.id + '"' + (disabled ? " disabled" : "") + ">Buy " + formatLogAmount(costLog) + "</button>" +
        "</div>"
      );
    }).join("");
    applyButtonHandlers(dom.runUpgrades, ".upgrade-button", buyRunUpgrade);
  }

  function renderPrestige() {
    dom.prestigeCards.innerHTML = PRESTIGE_UPGRADES.map((upgrade) => {
      const level = state.prestigeUpgrades[upgrade.id];
      const maxed = level >= upgrade.max;
      const cost = maxed ? "max" : String(upgrade.cost(level));
      const disabled = maxed || state.insight < upgrade.cost(level);
      return (
        '<div class="upgrade-card">' +
        '<div class="card-title">' + upgrade.title + "</div>" +
        '<div class="card-meta">' + upgrade.description + " " + upgrade.effectText(level) + "</div>" +
        '<button class="upgrade-button" type="button" data-id="' + upgrade.id + '"' + (disabled ? " disabled" : "") + ">" + (maxed ? "Maxed" : "Buy " + cost) + "</button>" +
        "</div>"
      );
    }).join("");
    applyButtonHandlers(dom.prestigeCards, ".upgrade-button", buyPrestigeUpgrade);
  }

  function renderFocus() {
    if (!hasFocusUnlocked(state)) {
      dom.focusButtons.innerHTML = '<div class="upgrade-card"><div class="card-meta">Locked</div></div>';
      return;
    }
    dom.focusButtons.innerHTML = FOCUS_OPTIONS.map((option) => {
      const active = option.id === state.focus ? " keyboard-anchor" : "";
      return '<button id="focus-' + option.id + '" class="focus-button' + active + '" type="button" data-id="' + option.id + '">' + option.title + "</button>";
    }).join("");
    applyButtonHandlers(dom.focusButtons, ".focus-button", setFocus);
  }

  function applyButtonHandlers(root, selector, handler) {
    root.querySelectorAll(selector).forEach((button) => {
      button.addEventListener("click", () => handler(button.dataset.id));
    });
  }

  function getAutoEtaSeconds(targetCostLog) {
    if (!isFinite(targetCostLog) || state.totalLog >= targetCostLog) {
      return 0;
    }
    const rateLog = getAutoGenerationLogPerSecond(state);
    if (!isFinite(rateLog)) {
      return Infinity;
    }
    const remaining = logSubtract(targetCostLog, state.totalLog);
    return Math.pow(10, remaining - rateLog);
  }

  function getKeyboardTargets() {
    return Array.from(document.querySelectorAll("button")).filter((button) => !button.disabled && button.offsetParent !== null);
  }

  function getKeyboardTargetId(element) {
    return element.id || (element.dataset.id ? element.tagName + ":" + element.dataset.id : element.textContent.trim());
  }

  function moveKeyboardSelection(direction) {
    const targets = getKeyboardTargets();
    if (!targets.length) {
      return;
    }
    const index = targets.findIndex((element) => getKeyboardTargetId(element) === keyboardSelectionId);
    const nextIndex = index === -1 ? 0 : (index + direction + targets.length) % targets.length;
    keyboardSelectionId = getKeyboardTargetId(targets[nextIndex]);
    renderKeyboardSelection();
  }

  function activateKeyboardSelection() {
    const targets = getKeyboardTargets();
    if (!targets.length) {
      return;
    }
    const selected = targets.find((element) => getKeyboardTargetId(element) === keyboardSelectionId) || targets[0];
    selected.click();
  }

  function renderKeyboardSelection() {
    document.querySelectorAll(".keyboard-selected").forEach((element) => {
      element.classList.remove("keyboard-selected");
    });
    const targets = getKeyboardTargets();
    if (!targets.length) {
      return;
    }
    const selected = targets.find((element) => getKeyboardTargetId(element) === keyboardSelectionId) || targets[0];
    keyboardSelectionId = getKeyboardTargetId(selected);
    selected.classList.add("keyboard-selected");
  }

  function cloneState(current) {
    return {
      ...current,
      prestigeUpgrades: { ...current.prestigeUpgrades },
      runUpgrades: { ...current.runUpgrades }
    };
  }

  function logAdd(a, b) {
    if (!isFinite(a)) {
      return b;
    }
    if (!isFinite(b)) {
      return a;
    }
    const high = Math.max(a, b);
    const low = Math.min(a, b);
    if (high - low > 12) {
      return high;
    }
    return high + Math.log10(1 + Math.pow(10, low - high));
  }

  function logSubtract(a, b) {
    if (!isFinite(b)) {
      return a;
    }
    if (!isFinite(a) || b > a) {
      return NEG_INF;
    }
    if (a - b > 12) {
      return a;
    }
    const inner = 1 - Math.pow(10, b - a);
    return inner <= 0 ? NEG_INF : a + Math.log10(inner);
  }

  function logMultiply(logValue, scalar) {
    if (!isFinite(logValue) || scalar <= 0) {
      return NEG_INF;
    }
    return logValue + Math.log10(scalar);
  }

  function formatLogAmount(logValue) {
    if (!isFinite(logValue)) {
      return "0";
    }
    if (logValue < 6) {
      return shortPlain(Math.pow(10, logValue));
    }
    let working = logValue;
    let eCount = 1;
    while (working >= 100 && eCount < 99) {
      working = Math.log10(working);
      eCount += 1;
    }
    let exponent = Math.floor(working);
    let mantissa = Math.round(Math.pow(10, working - exponent));
    if (mantissa >= 10) {
      mantissa = 1;
      exponent += 1;
    }
    const marker = eCount < 10 ? "e".repeat(eCount) : "E" + eCount;
    return mantissa + marker + "+" + exponent;
  }

  function shortPlain(value) {
    if (!isFinite(value)) {
      return "0";
    }
    if (Math.abs(value) >= 1000) {
      return Math.round(value).toString();
    }
    if (Math.abs(value) >= 100) {
      return value.toFixed(0);
    }
    if (Math.abs(value) >= 10) {
      return value.toFixed(1);
    }
    return value.toFixed(2);
  }

  function formatEta(seconds) {
    if (seconds === 0) {
      return "ready";
    }
    if (!isFinite(seconds)) {
      return "manual only";
    }
    if (seconds < 60) {
      return shortPlain(seconds) + "s";
    }
    if (seconds < 3600) {
      return shortPlain(seconds / 60) + "m";
    }
    if (seconds < 86400) {
      return shortPlain(seconds / 3600) + "h";
    }
    return shortPlain(seconds / 86400) + "d";
  }

  function stirlingLog10(value) {
    const x = Math.max(1.0001, value);
    return x * Math.log10(x / Math.E) + 0.5 * Math.log10(2 * Math.PI * x);
  }

  window.render_game_to_text = function renderGameToText() {
    return JSON.stringify({
      mode: "incremental",
      total_clicks: formatLogAmount(state.totalLog),
      gain_per_click: formatLogAmount(getCurrentGainLog(state)),
      function_value: formatLogAmount(getCurrentFunctionValueLog(state)),
      derivative_value: formatLogAmount(getCurrentDerivativeValueLog(state)),
      next_click_gain: formatLogAmount(getNextManualGainLog(state)),
      progression_x: Number(getProgressX(state).toFixed(2)),
      manual_presses: state.manualClicks,
      current_function: FUNCTIONS[state.functionIndex].label,
      current_function_index: state.functionIndex,
      next_function: FUNCTIONS[state.functionIndex + 1] ? FUNCTIONS[state.functionIndex + 1].label : null,
      next_function_cost: FUNCTIONS[state.functionIndex + 1] ? formatLogAmount(getFunctionCostLog(state, state.functionIndex + 1)) : null,
      auto_clicks_per_second: Number(getAutoClicksPerSecond(state).toFixed(2)),
      insight: state.insight,
      rebirth_reward: getRebirthReward(state),
      focus: state.focus,
      hybrid_rank: state.prestigeUpgrades.hybrid,
      run_upgrades: { ...state.runUpgrades },
      prestige_upgrades: { ...state.prestigeUpgrades },
      highest_run: formatLogAmount(state.highestRunLog),
      status: state.statusLine
    });
  };

  window.advanceTime = function advanceTime(ms) {
    const slices = Math.max(1, Math.round(ms / 50));
    const chunk = ms / slices;
    for (let i = 0; i < slices; i += 1) {
      step(chunk);
    }
    render();
  };

  window.functionForge = {
    getState() {
      return JSON.parse(window.render_game_to_text());
    },
    resetSave() {
      cancelAnimationFrame(rafId);
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };
})();
