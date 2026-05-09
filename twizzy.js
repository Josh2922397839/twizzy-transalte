/* ========================================
   The Ultimate Slang Translator — Engine v2
   Highlighting · Voice · History · Fuzzy · Share
   ======================================== */

// ── DOM ──
const $ = (id) => document.getElementById(id);

const el = {
  input: $("inputText"),
  outputDisplay: $("outputDisplay"),
  outputRaw: $("outputText"),
  inputLabel: $("inputLabel"),
  outputLabel: $("outputLabel"),
  artistSelect: $("artistSelect"),
  outputSelect: $("outputSelect"),
  swapBtn: $("swapBtn"),
  clearBtn: $("clearBtn"),
  copyBtn: $("copyBtn"),
  copyTooltip: $("copyTooltip"),
  inputCount: $("inputCount"),
  outputCount: $("outputCount"),
  themeToggle: $("themeToggle"),
  dictToggle: $("dictToggle"),
  dictOverlay: $("dictOverlay"),
  dictClose: $("dictClose"),
  dictSearch: $("dictSearchInput"),
  dictList: $("dictList"),
  dictCount: $("dictCount"),
  artistCount: $("artistCount"),
  suggestions: $("suggestionsBox"),
  exportBtn: $("exportBtn"),
  importBtn: $("importBtn"),
  importFile: $("importFile"),
  speakBtn: $("speakBtn"),
  voiceBtn: $("voiceInputBtn"),
  shareBtn: $("shareBtn"),
  historyToggle: $("historyToggle"),
  historyOverlay: $("historyOverlay"),
  historyClose: $("historyClose"),
  historyClear: $("historyClear"),
  historyList: $("historyList"),
  statsBar: $("statsBar"),
  toast: $("toast"),
};

// ── State ──
let isEngToSlang = false;
let currentArtist = "Yeat";
let dictSlangToEng = {};
let dictEngToSlang = {};
let activeRegex = null;
let history = JSON.parse(localStorage.getItem("slang-history") || "[]");
let isListening = false;
let recognition = null;

// ── Utilities ──
function escapeHtml(text) {
  const el = document.createElement("span");
  el.textContent = text;
  return el.innerHTML;
}

function isAllCaps(str) {
  return str.length > 1 && str === str.toUpperCase() && str !== str.toLowerCase();
}

function isCapitalized(str) {
  return str[0] !== str[0].toLowerCase();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ── Toast Notifications ──
let toastTimer;
function showToast(message, duration) {
  duration = duration || 2500;
  clearTimeout(toastTimer);
  el.toast.textContent = message;
  el.toast.classList.add("toast--visible");
  toastTimer = setTimeout(function () {
    el.toast.classList.remove("toast--visible");
  }, duration);
}

// ── Dictionary Management ──
function buildDictionaries() {
  const raw = megaDictionary[currentArtist];
  dictSlangToEng = {};
  dictEngToSlang = {};

  for (const slang of Object.keys(raw)) {
    const meanings = raw[slang];
    dictSlangToEng[slang.toLowerCase()] = meanings[0];
    for (let i = 0; i < meanings.length; i++) {
      const key = meanings[i]
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      if (!(key in dictEngToSlang)) {
        dictEngToSlang[key] = slang;
      }
    }
  }

  const activeDict = isEngToSlang ? dictEngToSlang : dictSlangToEng;
  activeRegex = buildRegex(activeDict);
  translate();
  renderDictionary(el.dictSearch ? el.dictSearch.value : "");
  updateArtistCount();
}

function buildRegex(dict) {
  const keys = Object.keys(dict).sort(function (a, b) {
    return b.length - a.length;
  });
  if (keys.length === 0) return new RegExp("(?!x)x", "gi");

  const pattern = keys
    .map(function (key) {
      const escaped = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pre = /^\w/.test(key) ? "\\b" : "";
      const suf = /\w$/.test(key) ? "\\b" : "";
      return pre + escaped + suf;
    })
    .join("|");

  return new RegExp(pattern, "gi");
}

function populateDropdowns() {
  const artists = Object.keys(megaDictionary);
  var html = "";
  for (var i = 0; i < artists.length; i++) {
    var a = artists[i];
    var count = Object.keys(megaDictionary[a]).length;
    html += '<option value="' + a + '">' + a + " (" + count + " words)</option>";
  }
  el.artistSelect.innerHTML = html;
  el.outputSelect.innerHTML = html;
  el.artistSelect.value = currentArtist;
  el.outputSelect.value = currentArtist;
  updateArtistCount();
}

function updateArtistCount() {
  var words = Object.keys(megaDictionary[currentArtist]).length;
  var artists = Object.keys(megaDictionary).length;
  el.artistCount.textContent = words + " translations \xB7 " + artists + " artists";
}

// ── Translation Engine with Highlighting ──
function translate() {
  var raw = el.input.value;

  if (!raw.trim()) {
    el.outputDisplay.innerHTML =
      '<span class="text-panel__placeholder">Translation will appear here...</span>';
    el.outputRaw.value = "";
    updateCounts(0);
    return;
  }

  var dict = isEngToSlang ? dictEngToSlang : dictSlangToEng;
  var value = raw;

  if (!isEngToSlang) {
    value = value.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  var htmlParts = [];
  var plainText = "";
  var lastIndex = 0;
  var matchCount = 0;

  var regex = new RegExp(activeRegex.source, activeRegex.flags);
  var match;

  while ((match = regex.exec(value)) !== null) {
    var before = value.slice(lastIndex, match.index);
    if (before) {
      htmlParts.push(escapeHtml(before));
      plainText += before;
    }

    var original = match[0];
    var translation = dict[original.toLowerCase()];

    if (translation) {
      var result = translation;
      if (isAllCaps(original)) {
        result = translation.toUpperCase();
      } else if (isCapitalized(original)) {
        result = capitalize(translation);
      }

      htmlParts.push(
        '<span class="translated-word" title="' +
          escapeHtml(original) +
          " → " +
          escapeHtml(result) +
          '">' +
          escapeHtml(result) +
          "</span>"
      );
      plainText += result;
      matchCount++;
    } else {
      htmlParts.push(escapeHtml(original));
      plainText += original;
    }

    lastIndex = match.index + match[0].length;
  }

  var after = value.slice(lastIndex);
  if (after) {
    htmlParts.push(escapeHtml(after));
    plainText += after;
  }

  el.outputDisplay.innerHTML = htmlParts.join("");
  el.outputRaw.value = plainText;
  updateCounts(matchCount);

  saveHistoryDebounced(raw, plainText, matchCount);
}

// ── Counts & Stats ──
function updateCounts(matchCount) {
  el.inputCount.textContent = formatCount(el.input.value);
  el.outputCount.textContent = formatCount(el.outputRaw.value);

  if (typeof matchCount === "number" && el.input.value.trim()) {
    var totalWords = el.input.value.trim().split(/\s+/).length;
    var pct = totalWords > 0 ? Math.round((matchCount / totalWords) * 100) : 0;
    if (pct > 100) pct = 100;
    el.statsBar.innerHTML =
      '<span class="stats-bar__item">' +
      matchCount +
      " word" +
      (matchCount !== 1 ? "s" : "") +
      " translated</span>" +
      '<span class="stats-bar__dot">\xB7</span>' +
      '<span class="stats-bar__item">' +
      pct +
      "% coverage</span>" +
      '<span class="stats-bar__dot">\xB7</span>' +
      '<span class="stats-bar__item">' +
      Object.keys(isEngToSlang ? dictEngToSlang : dictSlangToEng).length +
      " terms available</span>";
    el.statsBar.style.display = "";
  } else {
    el.statsBar.style.display = "none";
  }
}

function formatCount(text) {
  var chars = text.length;
  var words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  var readTime = Math.max(1, Math.ceil(words / 200));
  return (
    chars +
    " char" +
    (chars !== 1 ? "s" : "") +
    " \xB7 " +
    words +
    " word" +
    (words !== 1 ? "s" : "") +
    " \xB7 " +
    readTime +
    " min read"
  );
}

// ── Autocomplete Suggestions with Fuzzy Fallback ──
function updateSuggestions() {
  if (!el.suggestions) return;

  var words = el.input.value.split(/\s+/);
  var last = words[words.length - 1];

  if (last.length < 2) {
    el.suggestions.innerHTML = "";
    return;
  }

  var search = last.toLowerCase();
  var dict = isEngToSlang ? dictEngToSlang : dictSlangToEng;
  var matches = [];

  var keys = Object.keys(dict);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].startsWith(search) && keys[i] !== search) {
      matches.push(keys[i]);
      if (matches.length >= 5) break;
    }
  }

  if (matches.length === 0) {
    matches = fuzzySearch(search, keys, 3);
  }

  if (matches.length === 0) {
    el.suggestions.innerHTML = "";
    return;
  }

  el.suggestions.innerHTML = matches
    .map(function (s) {
      return '<span class="suggestion-chip">' + escapeHtml(s) + "</span>";
    })
    .join("");

  el.suggestions.querySelectorAll(".suggestion-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var text = el.input.value;
      el.input.value = text.slice(0, text.length - last.length) + chip.textContent + " ";
      translate();
      el.suggestions.innerHTML = "";
      el.input.focus();
    });
  });
}

// ── Fuzzy Matching (Levenshtein Distance) ──
function levenshtein(a, b) {
  var m = a.length;
  var n = b.length;
  var dp = [];
  for (var i = 0; i <= m; i++) {
    dp[i] = [i];
    for (var j = 1; j <= n; j++) {
      dp[i][j] = 0;
    }
  }
  for (var j = 0; j <= n; j++) dp[0][j] = j;

  for (var i = 1; i <= m; i++) {
    for (var j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function fuzzySearch(query, keys, maxResults) {
  maxResults = maxResults || 3;
  var threshold = Math.max(1, Math.floor(query.length * 0.4));
  var scored = [];

  for (var i = 0; i < keys.length; i++) {
    var compareLen = Math.min(keys[i].length, query.length + 2);
    var dist = levenshtein(query, keys[i].slice(0, compareLen));
    if (dist <= threshold && dist > 0) {
      scored.push({ key: keys[i], dist: dist });
    }
  }

  scored.sort(function (a, b) {
    return a.dist - b.dist;
  });

  var result = [];
  for (var i = 0; i < Math.min(scored.length, maxResults); i++) {
    result.push(scored[i].key);
  }
  return result;
}

// ── Translation History ──
var saveHistoryDebounced = debounce(function (input, output, matchCount) {
  if (!input.trim() || !output.trim() || matchCount === 0) return;

  var entry = {
    input: input.slice(0, 200),
    output: output.slice(0, 200),
    artist: currentArtist,
    direction: isEngToSlang ? "eng→slang" : "slang→eng",
    time: Date.now(),
  };

  if (
    history.length > 0 &&
    history[0].input === entry.input &&
    history[0].artist === entry.artist
  ) {
    history[0] = entry;
  } else {
    history.unshift(entry);
  }

  if (history.length > 50) history = history.slice(0, 50);
  localStorage.setItem("slang-history", JSON.stringify(history));
}, 1500);

function renderHistory() {
  if (!history.length) {
    el.historyList.innerHTML =
      '<div class="history-empty">' +
      "<p>No translations yet</p>" +
      '<p class="history-empty__sub">Your recent translations will appear here</p>' +
      "</div>";
    return;
  }

  var html = "";
  for (var i = 0; i < history.length; i++) {
    var h = history[i];
    html +=
      '<div class="history-entry" data-index="' +
      i +
      '">' +
      '<div class="history-entry__meta">' +
      '<span class="history-entry__artist">' +
      escapeHtml(h.artist) +
      "</span>" +
      '<span class="history-entry__dir">' +
      h.direction +
      "</span>" +
      '<span class="history-entry__time">' +
      timeAgo(h.time) +
      "</span>" +
      "</div>" +
      '<div class="history-entry__text">' +
      '<span class="history-entry__input">' +
      escapeHtml(h.input) +
      "</span>" +
      '<span class="history-entry__arrow">→</span>' +
      '<span class="history-entry__output">' +
      escapeHtml(h.output) +
      "</span>" +
      "</div>" +
      "</div>";
  }
  el.historyList.innerHTML = html;

  el.historyList.querySelectorAll(".history-entry").forEach(function (entry) {
    entry.addEventListener("click", function () {
      var idx = parseInt(entry.dataset.index);
      var h = history[idx];
      el.input.value = h.input;
      currentArtist = h.artist;
      isEngToSlang = h.direction === "eng→slang";
      el.artistSelect.value = currentArtist;
      el.outputSelect.value = currentArtist;
      updateSwapUI();
      buildDictionaries();
      closeModal("historyOverlay");
      showToast("Loaded from history");
    });
  });
}

function timeAgo(timestamp) {
  var diff = Date.now() - timestamp;
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  var days = Math.floor(hrs / 24);
  if (days < 30) return days + "d ago";
  return Math.floor(days / 30) + "mo ago";
}

// ── Voice: Text-to-Speech ──
function speak(text) {
  if (!text) return;
  if (!window.speechSynthesis) {
    showToast("Speech not supported in this browser");
    return;
  }
  speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1;

  el.speakBtn.classList.add("panel-btn--active");
  utterance.onend = function () {
    el.speakBtn.classList.remove("panel-btn--active");
  };
  utterance.onerror = function () {
    el.speakBtn.classList.remove("panel-btn--active");
  };

  speechSynthesis.speak(utterance);
  showToast("Speaking...");
}

// ── Voice: Speech Recognition ──
function toggleVoiceInput() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    showToast("Speech recognition not supported in this browser");
    return;
  }

  if (isListening) {
    if (recognition) recognition.stop();
    isListening = false;
    el.voiceBtn.classList.remove("panel-btn--recording");
    return;
  }

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = function () {
    isListening = true;
    el.voiceBtn.classList.add("panel-btn--recording");
    showToast("Listening... speak now");
  };

  recognition.onresult = function (event) {
    var transcript = "";
    for (var i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    el.input.value = transcript;
    translate();
    updateSuggestions();
  };

  recognition.onend = function () {
    isListening = false;
    el.voiceBtn.classList.remove("panel-btn--recording");
  };

  recognition.onerror = function (e) {
    isListening = false;
    el.voiceBtn.classList.remove("panel-btn--recording");
    if (e.error !== "aborted") showToast("Voice error: " + e.error);
  };

  recognition.start();
}

// ── Modal Management ──
function openModal(id) {
  $(id).classList.add("modal-overlay--open");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  $(id).classList.remove("modal-overlay--open");
  document.body.style.overflow = "";
}

// ── Swap Direction ──
function updateSwapUI() {
  if (isEngToSlang) {
    el.artistSelect.classList.add("hidden");
    el.inputLabel.classList.remove("hidden");
    el.outputLabel.classList.add("hidden");
    el.outputSelect.classList.remove("hidden");
  } else {
    el.artistSelect.classList.remove("hidden");
    el.inputLabel.classList.add("hidden");
    el.outputLabel.classList.remove("hidden");
    el.outputSelect.classList.add("hidden");
  }
}

// ── Event Listeners ──

// Live translation
el.input.addEventListener("input", function () {
  translate();
  updateSuggestions();
});

// Artist selection
el.artistSelect.addEventListener("change", function (e) {
  currentArtist = e.target.value;
  el.outputSelect.value = currentArtist;
  buildDictionaries();
});

el.outputSelect.addEventListener("change", function (e) {
  currentArtist = e.target.value;
  el.artistSelect.value = currentArtist;
  buildDictionaries();
});

// Swap
el.swapBtn.addEventListener("click", function () {
  isEngToSlang = !isEngToSlang;
  el.swapBtn.classList.add("swapping");
  setTimeout(function () {
    el.swapBtn.classList.remove("swapping");
  }, 300);
  updateSwapUI();
  el.input.value = el.outputRaw.value;
  el.input.focus();
  buildDictionaries();
});

// Clear
el.clearBtn.addEventListener("click", function () {
  el.input.value = "";
  el.outputDisplay.innerHTML =
    '<span class="text-panel__placeholder">Translation will appear here...</span>';
  el.outputRaw.value = "";
  el.suggestions.innerHTML = "";
  el.input.focus();
  updateCounts(0);
  el.clearBtn.classList.add("pulse");
  setTimeout(function () {
    el.clearBtn.classList.remove("pulse");
  }, 300);
});

// Copy
el.copyBtn.addEventListener("click", function () {
  var text = el.outputRaw.value;
  if (!text) return;

  var fallbackCopy = function () {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showCopyFeedback();
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showCopyFeedback, fallbackCopy);
  } else {
    fallbackCopy();
  }
});

function showCopyFeedback() {
  el.copyBtn.classList.add("panel-btn--success");
  el.copyTooltip.textContent = "Copied!";
  el.copyTooltip.classList.add("tooltip--visible");
  var copyIcon = el.copyBtn.querySelector(".copy-icon");
  var checkIcon = el.copyBtn.querySelector(".check-icon");
  if (copyIcon) copyIcon.classList.add("hidden");
  if (checkIcon) checkIcon.classList.remove("hidden");

  showToast("Copied to clipboard");

  setTimeout(function () {
    el.copyBtn.classList.remove("panel-btn--success");
    el.copyTooltip.textContent = "Copy";
    el.copyTooltip.classList.remove("tooltip--visible");
    if (copyIcon) copyIcon.classList.remove("hidden");
    if (checkIcon) checkIcon.classList.add("hidden");
  }, 1500);
}

// Export
el.exportBtn.addEventListener("click", function () {
  var text = el.outputRaw.value;
  if (!text) return;

  var ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
  var filename = "translation_" + currentArtist.replace(/\s+/g, "_") + "_" + ts + ".txt";
  var dir = isEngToSlang ? "English → Slang" : "Slang → English";
  var header =
    "=== Slang Translator ===\nArtist: " +
    currentArtist +
    "\nDirection: " +
    dir +
    "\nDate: " +
    new Date().toLocaleString() +
    "\n========================\n\n";
  var content = header + "Input:\n" + el.input.value + "\n\nTranslation:\n" + text;
  var blob = new Blob([content], { type: "text/plain" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Translation exported");
});

// Import
el.importBtn.addEventListener("click", function () {
  el.importFile.click();
});

el.importFile.addEventListener("change", function (e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (ev) {
    el.input.value = ev.target.result;
    translate();
    updateSuggestions();
    showToast("File imported");
  };
  reader.readAsText(file);
  el.importFile.value = "";
});

// Voice
el.speakBtn.addEventListener("click", function () {
  speak(el.outputRaw.value);
});

el.voiceBtn.addEventListener("click", function () {
  toggleVoiceInput();
});

// Share
el.shareBtn.addEventListener("click", function () {
  var text = el.outputRaw.value;
  if (!text) return;

  var shareText =
    el.input.value + "\n→ " + text + "\n\n(" + currentArtist + " \xB7 Slang Translator)";

  if (navigator.share) {
    navigator
      .share({ title: "Slang Translation", text: shareText })
      .catch(function (err) {
        if (err.name !== "AbortError") {
          copyShareFallback(shareText);
        }
      });
  } else {
    copyShareFallback(shareText);
  }
});

function copyShareFallback(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      showToast("Translation copied for sharing");
    });
  } else {
    showToast("Could not share");
  }
}

// History
el.historyToggle.addEventListener("click", function () {
  renderHistory();
  openModal("historyOverlay");
});

el.historyClose.addEventListener("click", function () {
  closeModal("historyOverlay");
});

el.historyClear.addEventListener("click", function () {
  history = [];
  localStorage.removeItem("slang-history");
  renderHistory();
  showToast("History cleared");
});

el.historyOverlay.addEventListener("click", function (e) {
  if (e.target === el.historyOverlay) closeModal("historyOverlay");
});

// Dictionary modal
el.dictToggle.addEventListener("click", function () {
  el.dictSearch.value = "";
  renderDictionary("");
  openModal("dictOverlay");
  setTimeout(function () {
    el.dictSearch.focus();
  }, 100);
});

el.dictClose.addEventListener("click", function () {
  closeModal("dictOverlay");
});

el.dictOverlay.addEventListener("click", function (e) {
  if (e.target === el.dictOverlay) closeModal("dictOverlay");
});

var dictSearchTimer;
el.dictSearch.addEventListener("input", function () {
  clearTimeout(dictSearchTimer);
  dictSearchTimer = setTimeout(function () {
    renderDictionary(el.dictSearch.value);
  }, 120);
});

function renderDictionary(term) {
  var search = term.toLowerCase().trim();
  var entries = Object.entries(megaDictionary[currentArtist]);

  if (search) {
    entries = entries.filter(function (pair) {
      var slang = pair[0];
      var meanings = pair[1];
      if (slang.toLowerCase().includes(search)) return true;
      for (var i = 0; i < meanings.length; i++) {
        if (meanings[i].toLowerCase().includes(search)) return true;
      }
      return false;
    });
  }

  entries.sort(function (a, b) {
    return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
  });

  el.dictCount.textContent =
    "Showing " +
    entries.length +
    " translation" +
    (entries.length !== 1 ? "s" : "") +
    " for " +
    currentArtist;

  if (entries.length === 0) {
    el.dictList.innerHTML =
      '<div class="dict-empty">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>' +
      '<p>No translations found for "' +
      escapeHtml(term) +
      '"</p>' +
      "</div>";
    return;
  }

  var html = "";
  for (var i = 0; i < entries.length; i++) {
    var slang = entries[i][0];
    var meanings = entries[i][1];
    html +=
      '<div class="dict-entry">' +
      '<div class="dict-entry__slang">' +
      escapeHtml(slang) +
      "</div>" +
      '<div class="dict-entry__arrow">→</div>' +
      '<div class="dict-entry__meaning">' +
      meanings.map(escapeHtml).join(", ") +
      "</div>" +
      "</div>";
  }
  el.dictList.innerHTML = html;
}

// ── Theme Toggle ──
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("slang-theme", theme);

  var knob = document.querySelector(".theme-toggle__knob");
  if (theme === "dark") {
    knob.innerHTML =
      '<svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  } else {
    knob.innerHTML =
      '<svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
  }

  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#06060c" : "#f4f2f7";
}

var savedTheme = localStorage.getItem("slang-theme") || "dark";
setTheme(savedTheme);

el.themeToggle.addEventListener("click", function () {
  var current = document.documentElement.getAttribute("data-theme");
  setTheme(current === "dark" ? "light" : "dark");
});

// ── Keyboard Shortcuts ──
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    if (el.dictOverlay.classList.contains("modal-overlay--open")) {
      closeModal("dictOverlay");
    } else if (el.historyOverlay.classList.contains("modal-overlay--open")) {
      closeModal("historyOverlay");
    }
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
    var key = e.key.toUpperCase();
    if (key === "S") {
      e.preventDefault();
      el.swapBtn.click();
    } else if (key === "C") {
      e.preventDefault();
      el.copyBtn.click();
    } else if (key === "D") {
      e.preventDefault();
      if (el.dictOverlay.classList.contains("modal-overlay--open")) {
        closeModal("dictOverlay");
      } else {
        el.dictToggle.click();
      }
    } else if (key === "H") {
      e.preventDefault();
      if (el.historyOverlay.classList.contains("modal-overlay--open")) {
        closeModal("historyOverlay");
      } else {
        el.historyToggle.click();
      }
    } else if (key === "V") {
      e.preventDefault();
      el.voiceBtn.click();
    }
  }
});

// ── Drag & Drop ──
el.input.addEventListener("dragover", function (e) {
  e.preventDefault();
  el.input.classList.add("drag-over");
});

el.input.addEventListener("dragleave", function () {
  el.input.classList.remove("drag-over");
});

el.input.addEventListener("drop", function (e) {
  e.preventDefault();
  el.input.classList.remove("drag-over");

  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    var file = e.dataTransfer.files[0];
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        el.input.value = ev.target.result;
        translate();
        updateSuggestions();
        showToast("File dropped and loaded");
      };
      reader.readAsText(file);
      return;
    }
  }

  var text = e.dataTransfer.getData("text");
  if (text) {
    el.input.value = text;
    translate();
    updateSuggestions();
  }
});

// ── Initialize ──
populateDropdowns();
buildDictionaries();
