/* ========================================
   The Ultimate Slang Translator — Enhanced Engine
   ======================================== */

// ── DOM Elements ──
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const inputLabel = document.getElementById("inputLabel");
const outputLabel = document.getElementById("outputLabel");
const artistSelect = document.getElementById("artistSelect");
const outputSelect = document.getElementById("outputSelect");
const swapBtn = document.getElementById("swapBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const copyTooltip = document.getElementById("copyTooltip");
const inputCount = document.getElementById("inputCount");
const outputCount = document.getElementById("outputCount");
const themeToggle = document.getElementById("themeToggle");
const dictToggle = document.getElementById("dictToggle");
const dictOverlay = document.getElementById("dictOverlay");
const dictClose = document.getElementById("dictClose");
const dictSearchInput = document.getElementById("dictSearchInput");
const dictList = document.getElementById("dictList");
const dictCount = document.getElementById("dictCount");
const artistCountEl = document.getElementById("artistCount");
const suggestionsBox = document.getElementById("suggestionsBox");

// ── State ──
let isEnglishToArtist = false;
let currentArtist = "Yeat";

// ── Build Dictionaries ──
let dictionaryEng = {};
let dictionaryArtist = {};
let reg = null;

function initializeDictionaries() {
  const currentMegaDict = megaDictionary[currentArtist];

  // Slang → English (Key is Slang, Value[0] is English)
  const dictSlangToEng = Object.fromEntries(
    Object.entries(currentMegaDict).map(([slang, engArray]) => [slang.toLowerCase(), engArray[0]])
  );

  // English → Slang (Key is English meaning, Value is Slang)
  const dictEngToSlang = {};
  Object.entries(currentMegaDict).forEach(([slang, engArray]) => {
    engArray.forEach((engWord) => {
      const normalized = engWord
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (!(normalized in dictEngToSlang)) {
        dictEngToSlang[normalized] = slang;
      }
    });
  });

  // If isEnglishToArtist is true, use EngToSlang. Otherwise SlangToEng.
  dictionaryEng = dictEngToSlang; // Keep global vars to minimize changes to translate()
  dictionaryArtist = dictSlangToEng; 

  reg = buildRegex(isEnglishToArtist ? dictionaryEng : dictionaryArtist);
  translate();
  renderDictionary(dictSearchInput.value); // Update modal if open
  updateArtistCount();
}

function buildRegex(mapObj) {
  // Sort by key length descending so longer phrases match first
  const keys = Object.keys(mapObj).sort((a, b) => b.length - a.length);
  
  const escapedKeys = keys.map((key) => {
    const escaped = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    // Add word boundaries if the key starts/ends with a word character
    const prefix = /^\w/.test(key) ? "\\b" : "";
    const suffix = /\w$/.test(key) ? "\\b" : "";
    return prefix + escaped + suffix;
  });

  return new RegExp(escapedKeys.join("|"), "gi");
}

function populateDropdowns() {
  const artists = Object.keys(megaDictionary);
  const optionsHtml = artists
    .map((artist) => {
      const count = Object.keys(megaDictionary[artist]).length;
      return `<option value="${artist}">${artist} (${count} words)</option>`;
    })
    .join("");

  artistSelect.innerHTML = optionsHtml;
  outputSelect.innerHTML = optionsHtml;
  
  artistSelect.value = currentArtist;
  outputSelect.value = currentArtist;
  updateArtistCount();
}

function updateArtistCount() {
  if (artistCountEl) {
    const count = Object.keys(megaDictionary[currentArtist]).length;
    const totalArtists = Object.keys(megaDictionary).length;
    artistCountEl.textContent = `${count} translations · ${totalArtists} artists`;
  }
}

// ── Translation Logic ──
function translate() {
  let value = inputText.value;
  const currentDict = isEnglishToArtist ? dictionaryEng : dictionaryArtist;

  // Normalize accented chars when translating from Artist to English
  if (!isEnglishToArtist) {
    value = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  outputText.value = value.replace(reg, function (matched) {
    const translation = currentDict[matched.toLowerCase()];
    if (!translation) return matched;

    // Handle case preservation
    if (isAllCaps(matched) && matched.length > 1) {
      return translation.toUpperCase();
    }
    if (initialIsCapital(matched)) {
      return capitalizeFirstLetter(translation);
    }
    return translation;
  });

  updateCounts();
}

function initialIsCapital(word) {
  return word[0] !== word[0].toLowerCase();
}

function isAllCaps(word) {
  return word === word.toUpperCase() && word !== word.toLowerCase();
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// ── Character / Word Counts ──
function updateCounts() {
  inputCount.textContent = formatCount(inputText.value);
  outputCount.textContent = formatCount(outputText.value);
}

function formatCount(text) {
  const chars = text.length;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  return `${chars} char${chars !== 1 ? "s" : ""} · ${words} word${words !== 1 ? "s" : ""}`;
}

// ── Event Listeners ──

// Live translation on input
inputText.addEventListener("input", () => {
  translate();
  updateSuggestions();
});

// Autocomplete Suggestions
function updateSuggestions() {
  if (!suggestionsBox) return;
  
  const text = inputText.value;
  const words = text.split(/\s+/);
  const lastWord = words[words.length - 1];
  
  if (lastWord.length < 2) {
    suggestionsBox.innerHTML = "";
    return;
  }

  const search = lastWord.toLowerCase();
  const currentDict = isEnglishToArtist ? dictionaryEng : dictionaryArtist;
  const suggestions = [];
  
  for (const key of Object.keys(currentDict)) {
    if (key.toLowerCase().startsWith(search) && key.toLowerCase() !== search) {
      // Capitalize properly if the key is capitalized
      const displayKey = initialIsCapital(key) ? capitalizeFirstLetter(key) : key;
      suggestions.push(displayKey);
      if (suggestions.length >= 5) break;
    }
  }
  
  if (suggestions.length === 0) {
    suggestionsBox.innerHTML = "";
    return;
  }
  
  suggestionsBox.innerHTML = suggestions.map(s => `<span class="suggestion-chip">${s}</span>`).join("");
  
  const chips = suggestionsBox.querySelectorAll('.suggestion-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const textVal = inputText.value;
      const newText = textVal.slice(0, textVal.length - lastWord.length) + chip.textContent + " ";
      inputText.value = newText;
      translate();
      suggestionsBox.innerHTML = "";
      inputText.focus();
    });
  });
}

// Artist changes
artistSelect.addEventListener("change", (e) => {
  currentArtist = e.target.value;
  outputSelect.value = currentArtist;
  initializeDictionaries();
});
outputSelect.addEventListener("change", (e) => {
  currentArtist = e.target.value;
  artistSelect.value = currentArtist;
  initializeDictionaries();
});

// Swap languages
swapBtn.addEventListener("click", function () {
  isEnglishToArtist = !isEnglishToArtist;

  // Animate swap button
  swapBtn.classList.add("swapping");
  setTimeout(() => swapBtn.classList.remove("swapping"), 300);

  // Toggle UI visibility
  if (isEnglishToArtist) {
    artistSelect.classList.add("hidden");
    inputLabel.classList.remove("hidden");
    outputLabel.classList.add("hidden");
    outputSelect.classList.remove("hidden");
  } else {
    artistSelect.classList.remove("hidden");
    inputLabel.classList.add("hidden");
    outputLabel.classList.remove("hidden");
    outputSelect.classList.add("hidden");
  }

  // Move output to input
  inputText.value = outputText.value;
  inputText.focus();

  // Re-translate
  initializeDictionaries();
});

// Clear input
clearBtn.addEventListener("click", function () {
  inputText.value = "";
  outputText.value = "";
  if (suggestionsBox) suggestionsBox.innerHTML = "";
  inputText.focus();
  updateCounts();

  // Pulse animation
  clearBtn.classList.add("pulse");
  setTimeout(() => clearBtn.classList.remove("pulse"), 300);
});

// Copy output
copyBtn.addEventListener("click", async function () {
  const text = outputText.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    // Success feedback
    copyBtn.classList.add("panel-btn--success");
    copyTooltip.textContent = "Copied!";
    copyTooltip.classList.add("tooltip--visible");
    const copyIcon = copyBtn.querySelector('.copy-icon');
    const checkIcon = copyBtn.querySelector('.check-icon');
    if(copyIcon) copyIcon.classList.add('hidden');
    if(checkIcon) checkIcon.classList.remove('hidden');

    setTimeout(() => {
      copyBtn.classList.remove("panel-btn--success");
      copyTooltip.textContent = "Copy";
      copyTooltip.classList.remove("tooltip--visible");
      if(copyIcon) copyIcon.classList.remove('hidden');
      if(checkIcon) checkIcon.classList.add('hidden');
    }, 1500);
  } catch (err) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);

    copyBtn.classList.add("panel-btn--success");
    copyTooltip.textContent = "Copied!";
    copyTooltip.classList.add("tooltip--visible");
    const copyIcon = copyBtn.querySelector('.copy-icon');
    const checkIcon = copyBtn.querySelector('.check-icon');
    if(copyIcon) copyIcon.classList.add('hidden');
    if(checkIcon) checkIcon.classList.remove('hidden');
    setTimeout(() => {
      copyBtn.classList.remove("panel-btn--success");
      copyTooltip.textContent = "Copy";
      copyTooltip.classList.remove("tooltip--visible");
      if(copyIcon) copyIcon.classList.remove('hidden');
      if(checkIcon) checkIcon.classList.add('hidden');
    }, 1500);
  }
});

// Export translation
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

exportBtn.addEventListener("click", function () {
  const text = outputText.value;
  if (!text) return;

  const timestamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
  const filename = `translation_${currentArtist.replace(/\s+/g, "_")}_${timestamp}.txt`;
  const header = `=== Twizzy Translate ===\nArtist: ${currentArtist}\nDirection: ${isEnglishToArtist ? "English → Slang" : "Slang → English"}\nDate: ${new Date().toLocaleString()}\n${"=".repeat(24)}\n\n`;
  const blob = new Blob([header + "Input:\n" + inputText.value + "\n\nTranslation:\n" + text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  exportBtn.classList.add("panel-btn--success");
  setTimeout(() => exportBtn.classList.remove("panel-btn--success"), 1500);
});

importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (ev) {
    inputText.value = ev.target.result;
    translate();
    updateSuggestions();
    updateCounts();
  };
  reader.readAsText(file);
  importFile.value = "";
});

// ── Theme Toggle ──
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("twizzy-theme", theme);

  const knob = document.querySelector(".theme-toggle__knob");
  if (theme === "dark") {
    knob.innerHTML = '<svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  } else {
    knob.innerHTML = '<svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
  }

  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = theme === "dark" ? "#06060c" : "#f4f2f7";
  }
}

const savedTheme = localStorage.getItem("twizzy-theme") || "dark";
setTheme(savedTheme);

themeToggle.addEventListener("click", function () {
  const current = document.documentElement.getAttribute("data-theme");
  setTheme(current === "dark" ? "light" : "dark");
});

// ── Dictionary Modal ──
function openDictionary() {
  dictOverlay.classList.add("dict-overlay--open");
  dictSearchInput.value = "";
  dictSearchInput.focus();
  renderDictionary("");
  document.body.style.overflow = "hidden";
}

function closeDictionary() {
  dictOverlay.classList.remove("dict-overlay--open");
  document.body.style.overflow = "";
}

function renderDictionary(searchTerm) {
  const search = searchTerm.toLowerCase().trim();
  let entries = Object.entries(megaDictionary[currentArtist]);

  if (search) {
    entries = entries.filter(([eng, artistArr]) => {
      const engMatch = eng.toLowerCase().includes(search);
      const artistMatch = artistArr.some((y) => y.toLowerCase().includes(search));
      return engMatch || artistMatch;
    });
  }

  // Sort alphabetically by English word
  entries.sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));

  dictCount.textContent = `Showing ${entries.length} translation${entries.length !== 1 ? "s" : ""} for ${currentArtist}`;

  if (entries.length === 0) {
    dictList.innerHTML = `
      <div class="dict-empty">
        <div class="dict-empty__emoji">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
        </div>
        <p>No translations found for "${searchTerm}"</p>
      </div>
    `;
    return;
  }

  dictList.innerHTML = entries
    .map(
      ([eng, artistArr]) => `
    <div class="dict-entry">
      <div class="dict-entry__eng">${escapeHtml(eng)}</div>
      <div class="dict-entry__arrow">→</div>
      <div class="dict-entry__yeat">${artistArr.map(escapeHtml).join(", ")}</div>
    </div>
  `
    )
    .join("");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

dictToggle.addEventListener("click", openDictionary);
dictClose.addEventListener("click", closeDictionary);

dictOverlay.addEventListener("click", function (e) {
  if (e.target === dictOverlay) {
    closeDictionary();
  }
});

// Close dictionary with Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && dictOverlay.classList.contains("dict-overlay--open")) {
    closeDictionary();
  }
});

// Dictionary search with debounce
let searchTimeout;
dictSearchInput.addEventListener("input", function () {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    renderDictionary(dictSearchInput.value);
  }, 150);
});

// ── Keyboard Shortcuts ──
document.addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
    e.preventDefault();
    swapBtn.click();
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
    e.preventDefault();
    copyBtn.click();
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
    e.preventDefault();
    if (dictOverlay.classList.contains("dict-overlay--open")) {
      closeDictionary();
    } else {
      openDictionary();
    }
  }
});

// ── Initialize ──
populateDropdowns();
initializeDictionaries();
