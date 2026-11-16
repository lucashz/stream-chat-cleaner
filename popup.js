/**
 * Stream Chat Rewards Cleaner - Popup UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const toggleKickAll = document.getElementById('toggleKickAll');
  const toggleTwitchAll = document.getElementById('toggleTwitchAll');
  const keywordForm = document.getElementById('keywordForm');
  const keywordInput = document.getElementById('keywordInput');
  const chipsContainer = document.getElementById('chipsContainer');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  const extensionAPI = (typeof chrome !== 'undefined' && chrome.storage)
    ? chrome
    : ((typeof browser !== 'undefined' && browser.storage) ? browser : null);

  const storage = extensionAPI
    ? (extensionAPI.storage.sync || extensionAPI.storage.local)
    : null;

  let currentKeywords = [];

  /* ==========================================================================
     1. DETECT ACTIVE TAB (CROSS-BROWSER)
     ========================================================================== */
  if (extensionAPI && extensionAPI.tabs) {
    extensionAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      if (activeTab && activeTab.url) {
        if (activeTab.url.includes('kick.com')) {
          statusDot.className = 'status-dot active-kick';
          statusText.textContent = 'Conectado ao chat da Kick';
        } else if (activeTab.url.includes('twitch.tv')) {
          statusDot.className = 'status-dot active-twitch';
          statusText.textContent = 'Conectado ao chat da Twitch';
        } else {
          statusDot.className = 'status-dot';
          statusText.textContent = 'Nenhum chat detectado na aba';
        }
      }
    });
  }

  /* ==========================================================================
     2. LOAD PERSISTED SETTINGS
     ========================================================================== */
  if (storage) {
    storage.get(
      {
        hideKickAll: true,
        hideTwitchAll: true,
        keywords: ['pokeidle']
      },
      (data) => {
        toggleKickAll.checked = data.hideKickAll !== false;
        toggleTwitchAll.checked = data.hideTwitchAll !== false;
        currentKeywords = Array.isArray(data.keywords) ? data.keywords : [];
        renderChips();
      }
    );
  }

  /* ==========================================================================
     3. SAVE SETTINGS
     ========================================================================== */
  function saveSettings() {
    if (!storage) return;
    const settings = {
      hideKickAll: toggleKickAll.checked,
      hideTwitchAll: toggleTwitchAll.checked,
      keywords: currentKeywords
    };
    storage.set(settings);
  }

  toggleKickAll.addEventListener('change', saveSettings);
  toggleTwitchAll.addEventListener('change', saveSettings);

  /* ==========================================================================
     4. KEYWORDS CHIPS LOGIC
     ========================================================================== */
  function renderChips() {
    chipsContainer.innerHTML = '';
    if (currentKeywords.length === 0) {
      const emptySpan = document.createElement('span');
      emptySpan.className = 'no-keywords';
      emptySpan.textContent = 'Nenhuma palavra cadastrada (ocultando tudo)';
      chipsContainer.appendChild(emptySpan);
      return;
    }

    currentKeywords.forEach((kw, index) => {
      const chip = document.createElement('div');
      chip.className = 'chip';

      const label = document.createElement('span');
      label.textContent = kw;

      const removeBtn = document.createElement('span');
      removeBtn.className = 'chip-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remover palavra';
      removeBtn.addEventListener('click', () => {
        currentKeywords.splice(index, 1);
        saveSettings();
        renderChips();
      });

      chip.appendChild(label);
      chip.appendChild(removeBtn);
      chipsContainer.appendChild(chip);
    });
  }

  keywordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = keywordInput.value.trim().toLowerCase();
    if (!val) return;

    if (!currentKeywords.includes(val)) {
      currentKeywords.push(val);
      saveSettings();
      renderChips();
    }
    keywordInput.value = '';
  });
});
