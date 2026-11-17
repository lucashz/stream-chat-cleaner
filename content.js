/**
 * Stream Chat Rewards Cleaner - Content Script
 * High-performance, zero-flicker suppression of channel point rewards and minigame clutter
 * Works on Kick.com and Twitch.tv across Chrome, Opera, Brave, Edge and Firefox.
 * Strictly preserves Subscriptions, Sub Gifts, Bits, and Kicks Donations.
 */

(function () {
  'use strict';

  if (window.__STREAM_CHAT_CLEANER_INJECTED__) return;
  window.__STREAM_CHAT_CLEANER_INJECTED__ = true;

  const IS_KICK = window.location.hostname.includes('kick.com');
  const IS_TWITCH = window.location.hostname.includes('twitch.tv');

  if (!IS_KICK && !IS_TWITCH) return;

  let config = {
    hideKickAll: true,
    hideTwitchAll: true,
    keywords: [],
    filterMode: 'all'
  };

  let activeChatObserver = null;
  let rootObserver = null;
  let currentObservedContainer = null;
  let lastUrl = window.location.href;

  /* ==========================================================================
     1. STORAGE & SETTINGS MANAGEMENT (CROSS-BROWSER: CHROME/OPERA/FIREFOX)
     ========================================================================== */

  const extensionAPI = (typeof chrome !== 'undefined' && chrome.storage)
    ? chrome
    : ((typeof browser !== 'undefined' && browser.storage) ? browser : null);

  function loadSettings(callback) {
    if (!extensionAPI || !extensionAPI.storage) {
      if (callback) callback();
      return;
    }

    const storage = extensionAPI.storage.sync || extensionAPI.storage.local;
    storage.get(
      {
        hideKickAll: true,
        hideTwitchAll: true,
        keywords: [],
        filterMode: 'all'
      },
      (items) => {
        config = {
          hideKickAll: items.hideKickAll !== false,
          hideTwitchAll: items.hideTwitchAll !== false,
          keywords: Array.isArray(items.keywords)
            ? items.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)
            : [],
          filterMode: items.filterMode || 'all'
        };
        applyGlobalAttributes();
        if (callback) callback();
      }
    );
  }

  function applyGlobalAttributes() {
    const root = document.documentElement;
    if (!root) return;

    if (IS_KICK) {
      const isEnabled = config.hideKickAll && config.filterMode === 'all';
      root.setAttribute('data-hide-kick-rewards', isEnabled ? 'true' : 'false');
    }

    if (IS_TWITCH) {
      const isEnabled = config.hideTwitchAll && config.filterMode === 'all';
      root.setAttribute('data-hide-twitch-rewards', isEnabled ? 'true' : 'false');
    }
  }

  if (extensionAPI && extensionAPI.storage && extensionAPI.storage.onChanged) {
    extensionAPI.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' || area === 'local') {
        loadSettings(() => {
          rescanExistingChatMessages();
        });
      }
    });
  }

  /* ==========================================================================
     2. SAFETY GUARDS & HEURISTICS (PRESERVING SUBS, BITS, KICKS)
     ========================================================================== */

  function isProtectedEvent(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;

    const text = (node.textContent || '').toLowerCase();
    const html = (node.innerHTML || '').toLowerCase();

    // 1. Bits / Cheers (Twitch)
    if (
      text.includes('cheer') ||
      text.includes('bits') ||
      html.includes('cheermote') ||
      html.includes('badge-bits') ||
      !!node.querySelector('[data-test-selector*="cheer"], [data-test-selector*="bits"], img[src*="cheer"], img[alt*="cheer" i]')
    ) {
      return true;
    }

    // 2. Subscriptions / Sub Gifts (Kick & Twitch)
    if (
      text.includes('se inscreveu') ||
      text.includes('inscreveu-se') ||
      text.includes('inscrição') ||
      text.includes('inscrições') ||
      text.includes('subscribed') ||
      text.includes('sub gifted') ||
      text.includes('gifted a') ||
      text.includes('presenteou') ||
      text.includes('subgift') ||
      text.includes('renovou') ||
      text.includes('tier 1') ||
      text.includes('tier 2') ||
      text.includes('tier 3') ||
      (node.hasAttribute('type') && (node.getAttribute('type') || '').includes('subscription')) ||
      !!node.querySelector('[data-a-target*="sub-message"], [data-a-target*="subscription"], [type*="subscription"]')
    ) {
      return true;
    }

    // 3. Kicks Gifts (Kick)
    if (
      text.includes('kicks') ||
      html.includes('kicksgifted') ||
      html.includes('kicks_gifted') ||
      !!node.querySelector('[data-ds-icon="Kicks"], [data-ds-icon="Kick"]')
    ) {
      return true;
    }

    // 4. Raids / Hosts
    if (
      text.includes('raid') ||
      text.includes('invadindo') ||
      text.includes('host') ||
      text.includes('hosped')
    ) {
      return true;
    }

    return false;
  }

  function markAsSafe(node) {
    const target = findMessageRowContainer(node);
    if (target) {
      target.setAttribute('data-stream-cleaner-safe', 'true');
      target.removeAttribute('data-stream-cleaner-hidden');
      target.style.removeProperty('display');
    }
  }

  /**
   * Kick Reward Detection Heuristics
   */
  function inspectKickNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

    if (isProtectedEvent(node)) {
      markAsSafe(node);
      return null;
    }

    const pEl = node.tagName.toLowerCase() === 'p' && node.classList.contains('line-clamp-2')
      ? node
      : (node.querySelector ? node.querySelector('p.line-clamp-2') : null);

    const text = node.textContent || '';
    const hasRedeemVerb = /\b(resgatou|redeemed)\b/i.test(text);

    const isNormalChatWithColon = /:\s*\S+/.test(text) && !hasRedeemVerb;
    const isRewardCard = !!pEl || (hasRedeemVerb && !isNormalChatWithColon);

    if (!isRewardCard) return null;

    let rewardName = '';
    if (pEl) {
      const boldSpan = pEl.querySelector('span.font-bold') || pEl.querySelector('span') || pEl;
      rewardName = boldSpan ? boldSpan.textContent.trim() : pEl.textContent.trim();
    } else {
      const match = text.match(/\b(?:resgatou|redeemed)\s+(.+)/i);
      rewardName = match ? match[1].trim() : text.trim();
    }

    return {
      isReward: true,
      rewardName
    };
  }

  /**
   * Twitch Reward Detection Heuristics
   */
  function inspectTwitchNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

    if (isProtectedEvent(node)) {
      markAsSafe(node);
      return null;
    }

    // 1. Channel Points / Reward indicators
    const hasRewardIcon = !!node.querySelector(
      '.channel-points-reward-line__icon, .channel-points-reward-line, [data-test-selector="channel-points-reward-icon"], img[src*="channel-points"], img[src*="custom-reward"], img[alt*="pontos" i], img[alt*="points" i]'
    );

    const text = node.textContent || '';
    const hasRedeemVerb = /\b(resgatou|redeemed)\b/i.test(text);
    const hasPointsWord = /pontos|points|pokeidle|capture boost|\+\d+%/i.test(text);

    // Matches any redemption notice on Twitch that is not a sub or cheer
    const isReward = hasRewardIcon || (hasRedeemVerb && hasPointsWord) || (hasRedeemVerb && !/:\s*\S+/.test(text));

    if (!isReward) return null;

    let rewardName = text.trim();
    const match = text.match(/\b(?:resgatou|redeemed)\s+(.+)/i);
    if (match) {
      rewardName = match[1].trim();
    }

    return {
      isReward: true,
      rewardName
    };
  }

  function shouldSuppress(rewardInfo) {
    if (!rewardInfo || !rewardInfo.isReward) return false;
    const isHideAllActive = IS_KICK ? config.hideKickAll : config.hideTwitchAll;

    if (config.filterMode === 'all' && isHideAllActive) return true;

    if (config.keywords.length > 0) {
      const lowerName = (rewardInfo.rewardName || '').toLowerCase();
      return config.keywords.some((keyword) => lowerName.includes(keyword));
    }

    return isHideAllActive;
  }

  function findMessageRowContainer(node) {
    if (!node) return null;

    if (IS_KICK) {
      const row = node.closest('[data-index]');
      if (row) return row;
      const pxPx = node.closest('.px-px');
      if (pxPx) return pxPx;
    }

    if (IS_TWITCH) {
      // Find direct child of chat-scrollable-area__message-container to hide the complete row + quote bar
      let curr = node;
      while (curr && curr.parentElement && !curr.parentElement.classList.contains('chat-scrollable-area__message-container')) {
        curr = curr.parentElement;
      }
      if (curr && curr.parentElement && curr.parentElement.classList.contains('chat-scrollable-area__message-container')) {
        return curr;
      }

      const row = node.closest(
        '.chat-line__status, div[data-test-selector="user-notice-line"], .chat-line__message, [data-a-target="chat-line-message"]'
      );
      if (row) return row;
    }

    let current = node;
    while (current && current !== document.body) {
      if (
        current.id === 'chatroom-messages' ||
        current.classList.contains('no-scrollbar') ||
        current.classList.contains('chat-scrollable-area__message-container')
      ) {
        break;
      }
      if (current.hasAttribute('data-chat-entry') || current.classList.contains('chat-entry')) {
        return current;
      }
      current = current.parentElement;
    }

    return node;
  }

  function suppressElement(node) {
    const target = findMessageRowContainer(node);
    if (!target) return;
    if (
      target.id === 'chatroom-messages' ||
      target.classList.contains('no-scrollbar') ||
      target.classList.contains('chat-scrollable-area__message-container') ||
      target.hasAttribute('data-stream-cleaner-safe')
    ) {
      return;
    }

    target.setAttribute('data-stream-cleaner-hidden', 'true');
    target.style.setProperty('display', 'none', 'important');
  }

  function evaluateNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

    if (isProtectedEvent(node)) {
      markAsSafe(node);
      return;
    }

    let info = null;
    if (IS_KICK) info = inspectKickNode(node);
    else if (IS_TWITCH) info = inspectTwitchNode(node);

    if (info && info.isReward) {
      if (shouldSuppress(info)) {
        suppressElement(node);
      }
    }
  }

  /* ==========================================================================
     3. HIGH-PERFORMANCE MUTATION OBSERVER & SWEEPER
     ========================================================================== */

  function processAddedNodes(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.nodeType === Node.ELEMENT_NODE) {
        evaluateNode(node);
        const children = node.children;
        for (let j = 0; j < children.length; j++) {
          evaluateNode(children[j]);
        }
      }
    }
  }

  function handleChatMutations(mutations) {
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        processAddedNodes(mutation.addedNodes);
      }
    }
  }

  function findChatContainer() {
    if (IS_KICK) {
      return (
        document.getElementById('chatroom-messages') ||
        document.querySelector('[id="chatroom-messages"]') ||
        document.querySelector('.no-scrollbar') ||
        document.querySelector('#channel-chatroom')
      );
    }
    if (IS_TWITCH) {
      return (
        document.querySelector('.chat-scrollable-area__message-container') ||
        document.querySelector('[data-a-target="chat-scroller"]') ||
        document.querySelector('.chat-room')
      );
    }
    return null;
  }

  function attachChatObserver(container) {
    if (!container || container === currentObservedContainer) return;

    if (activeChatObserver) activeChatObserver.disconnect();

    currentObservedContainer = container;
    activeChatObserver = new MutationObserver(handleChatMutations);
    activeChatObserver.observe(container, {
      childList: true,
      subtree: true
    });

    rescanExistingChatMessages();
  }

  function rescanExistingChatMessages() {
    const container = findChatContainer();
    if (!container) return;

    if (IS_KICK) {
      const items = container.querySelectorAll('[data-index]');
      items.forEach((item) => {
        if (isProtectedEvent(item)) {
          markAsSafe(item);
          return;
        }
        const info = inspectKickNode(item);
        if (info && info.isReward) {
          if (shouldSuppress(info)) {
            suppressElement(item);
          } else {
            const target = findMessageRowContainer(item);
            if (target) {
              target.removeAttribute('data-stream-cleaner-hidden');
              target.style.removeProperty('display');
            }
          }
        }
      });
    }

    if (IS_TWITCH) {
      const items = container.querySelectorAll(
        '.chat-scrollable-area__message-container > div, .chat-line__status, div[data-test-selector="user-notice-line"], .channel-points-reward-line__icon, .chat-line__message'
      );
      items.forEach((item) => {
        if (isProtectedEvent(item)) {
          markAsSafe(item);
          return;
        }
        const info = inspectTwitchNode(item);
        if (info && info.isReward) {
          if (shouldSuppress(info)) {
            suppressElement(item);
          } else {
            const target = findMessageRowContainer(item);
            if (target) {
              target.removeAttribute('data-stream-cleaner-hidden');
              target.style.removeProperty('display');
            }
          }
        }
      });
    }
  }

  setInterval(rescanExistingChatMessages, 400);

  /* ==========================================================================
     4. SPA NAVIGATION & RESILIENT MOUNTING
     ========================================================================== */

  function setupContainerWatcher() {
    const container = findChatContainer();
    if (container) attachChatObserver(container);

    if (!rootObserver) {
      rootObserver = new MutationObserver(() => {
        const currentContainer = findChatContainer();
        if (currentContainer && currentContainer !== currentObservedContainer) {
          attachChatObserver(currentContainer);
        }
      });

      rootObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  function handleUrlChange() {
    if (window.location.href === lastUrl) return;
    lastUrl = window.location.href;

    if (activeChatObserver) {
      activeChatObserver.disconnect();
      activeChatObserver = null;
    }
    currentObservedContainer = null;

    setTimeout(() => {
      setupContainerWatcher();
    }, 500);
  }

  const origPushState = history.pushState;
  history.pushState = function () {
    const ret = origPushState.apply(this, arguments);
    handleUrlChange();
    return ret;
  };

  const origReplaceState = history.replaceState;
  history.replaceState = function () {
    const ret = origReplaceState.apply(this, arguments);
    handleUrlChange();
    return ret;
  };

  window.addEventListener('popstate', handleUrlChange);
  window.addEventListener('hashchange', handleUrlChange);
  setInterval(handleUrlChange, 1500);

  /* ==========================================================================
     5. INITIALIZATION
     ========================================================================== */

  loadSettings(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupContainerWatcher);
    } else {
      setupContainerWatcher();
    }
  });
})();
