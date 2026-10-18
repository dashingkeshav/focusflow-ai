// FocusFlow AI — Content Script (Runs on permitted web pages & dashboard)
// Responsibilities:
//  1. Privacy-safe aggregate interaction metrics:
//     Counts of keystrokes, throttled mouse movements, clicks, scrolls,
//     visibility changes, and last interaction timestamp.
//     NEVER observes or transmits key values, text contents, passwords,
//     form inputs, private messages, or raw mouse coordinates.
//  2. YouTube contextual metadata extraction (video title, channel, video ID)
//     so the classifier can make intelligent, task-aware decisions without blanket-blocking.
//  3. Relay between MAIN world / web app (dashboard) and service worker:
//     - Extension presence discovery (FOCUSFLOW_EXTENSION_HELLO)
//     - Session lifecycle commands (FOCUSFLOW_EXTENSION_COMMAND)
//     - Warning overlay decisions (FOCUSFLOW_OVERLAY_DECISION)
//     - Site updates (FOCUSFLOW_SITE_UPDATE)

(function () {
  'use strict';

  // ── 1. Privacy-safe aggregate telemetry ──────────────────────────────────────
  let keyStrokeCount = 0;
  let mouseMovementCount = 0;
  let clickCount = 0;
  let scrollCount = 0;
  let lastInteractionTime = Date.now();
  let lastMouseMoveTime = 0;
  let lastScrollTime = 0;

  // Keystroke count only — NEVER logs event.key or target value.
  window.addEventListener(
    'keydown',
    () => {
      keyStrokeCount += 1;
      lastInteractionTime = Date.now();
    },
    { passive: true, capture: true }
  );

  // Throttled mouse movement count — NO coordinates or gestures stored.
  window.addEventListener(
    'mousemove',
    () => {
      const now = Date.now();
      if (now - lastMouseMoveTime > 200) {
        mouseMovementCount += 1;
        lastMouseMoveTime = now;
        lastInteractionTime = now;
      }
    },
    { passive: true, capture: true }
  );

  // Click count only.
  window.addEventListener(
    'click',
    () => {
      clickCount += 1;
      lastInteractionTime = Date.now();
    },
    { passive: true, capture: true }
  );

  // Throttled scroll count.
  window.addEventListener(
    'scroll',
    () => {
      const now = Date.now();
      if (now - lastScrollTime > 300) {
        scrollCount += 1;
        lastScrollTime = now;
        lastInteractionTime = now;
      }
    },
    { passive: true, capture: true }
  );

  // Visibility changes.
  document.addEventListener('visibilitychange', () => {
    lastInteractionTime = Date.now();
    try {
      chrome.runtime.sendMessage({
        type: 'VISIBILITY_CHANGE',
        isVisible: document.visibilityState === 'visible',
        url: window.location.href,
        domain: window.location.hostname,
        timestamp: Date.now(),
      });
    } catch {
      // Extension context invalidated during reload.
    }
  });

  // Periodic flush of interaction aggregates every 10 seconds.
  setInterval(() => {
    if (keyStrokeCount > 0 || mouseMovementCount > 0 || clickCount > 0 || scrollCount > 0) {
      try {
        chrome.runtime.sendMessage({
          type: 'INTERACTION_METRICS',
          keyStrokes: keyStrokeCount,
          mouseMovements: mouseMovementCount,
          clicks: clickCount,
          scrolls: scrollCount,
          lastInteraction: lastInteractionTime,
          isVisible: document.visibilityState === 'visible',
          url: window.location.href,
          domain: window.location.hostname,
        });
      } catch {
        // Extension context invalidated.
      }
      keyStrokeCount = 0;
      mouseMovementCount = 0;
      clickCount = 0;
      scrollCount = 0;
    }
  }, 10000);

  // ── 2. YouTube context-aware metadata extraction ────────────────────────────
  const isYouTube =
    window.location.hostname === 'www.youtube.com' ||
    window.location.hostname === 'youtube.com' ||
    window.location.hostname.endsWith('.youtube.com');

  if (isYouTube) {
    let lastReportedVideoId = null;
    let lastReportedTitle = '';

    function checkAndReportYouTube() {
      const url = new URL(window.location.href);
      const videoId = url.searchParams.get('v') || (url.pathname.startsWith('/shorts/') ? url.pathname.split('/')[2] : null);

      let videoTitle = '';
      const titleEl =
        document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
        document.querySelector('h1.title yt-formatted-string') ||
        document.querySelector('#title h1 yt-formatted-string');

      if (titleEl && titleEl.textContent && titleEl.textContent.trim()) {
        videoTitle = titleEl.textContent.trim();
      } else if (document.title && !document.title.startsWith('(') && document.title !== 'YouTube') {
        videoTitle = document.title.replace(/- YouTube$/i, '').trim();
      }

      let channelName = '';
      const channelEl =
        document.querySelector('#channel-name yt-formatted-string') ||
        document.querySelector('#owner-name a') ||
        document.querySelector('ytd-channel-name yt-formatted-string');
      if (channelEl && channelEl.textContent) {
        channelName = channelEl.textContent.trim();
      }

      // If we found a watch page or video title
      if (videoId || videoTitle) {
        if (videoId !== lastReportedVideoId || (videoTitle && videoTitle !== lastReportedTitle)) {
          lastReportedVideoId = videoId;
          lastReportedTitle = videoTitle;

          try {
            chrome.runtime.sendMessage({
              type: 'YOUTUBE_METADATA',
              videoId: videoId || null,
              title: videoTitle || document.title,
              channel: channelName,
              url: window.location.href,
            });
          } catch {
            // Extension context invalidated.
          }
        }
      }
    }

    // YouTube uses SPA navigation without full page reloads.
    window.addEventListener('yt-navigate-finish', () => {
      setTimeout(checkAndReportYouTube, 600);
      setTimeout(checkAndReportYouTube, 2000);
    });

    // Also observe title element changes
    const titleObserver = new MutationObserver(() => {
      checkAndReportYouTube();
    });
    const titleTag = document.querySelector('title');
    if (titleTag) {
      titleObserver.observe(titleTag, { childList: true, characterData: true, subtree: true });
    }

    // Initial check
    setTimeout(checkAndReportYouTube, 800);
    setTimeout(checkAndReportYouTube, 2500);
  }

  // ── 3. Dashboard Web App Bridge ──────────────────────────────────────────────
  const host = window.location.hostname;
  let bridgeInitialized = false;

  function initDashboardBridge() {
    if (bridgeInitialized) return;
    bridgeInitialized = true;

    window.__focusflowExtension = true;
    setTimeout(() => {
      if (document.documentElement) {
        document.documentElement.dataset.focusflowExtension = 'true';
      }
    }, 0);

    // Signal presence to web app
    window.dispatchEvent(new CustomEvent('FOCUSFLOW_EXTENSION_HELLO'));

    window.addEventListener('FOCUSFLOW_PING', () => {
      window.dispatchEvent(new CustomEvent('FOCUSFLOW_EXTENSION_HELLO'));
    });

    // Auto-sync authenticated session from localStorage if present
    function syncAuthFromPage() {
      try {
        const token = localStorage.getItem('focusflow_token');
        const userRaw = localStorage.getItem('focusflow_user');
        const user = userRaw ? JSON.parse(userRaw) : null;
        if (token && user && user.id) {
          chrome.runtime.sendMessage({
            type: 'FOCUSFLOW_AUTH_SYNC',
            token,
            user,
          }, () => void chrome.runtime.lastError);
        }
      } catch (_) {}
    }
    syncAuthFromPage();
    setTimeout(syncAuthFromPage, 800);

    // Explicit auth updates dispatched by auth context (login, logout, refresh)
    window.addEventListener('FOCUSFLOW_AUTH_SYNC', (event) => {
      const detail = event.detail || {};
      chrome.runtime.sendMessage({
        type: 'FOCUSFLOW_AUTH_SYNC',
        token: detail.token || null,
        user: detail.user || null,
      }, () => void chrome.runtime.lastError);
    });

    // Web app requesting real-time extension counters before session end
    window.addEventListener('FOCUSFLOW_GET_COUNTERS', () => {
      chrome.runtime.sendMessage({ type: 'FOCUSFLOW_GET_COUNTERS' }, (response) => {
        const err = chrome.runtime.lastError;
        const counters = (!err && response && response.counters) ? response.counters : {};
        window.dispatchEvent(new CustomEvent('FOCUSFLOW_COUNTERS_RESPONSE', { detail: counters }));
      });
    });

    // Relay commands from the web app (dashboard) to service worker
    window.addEventListener('FOCUSFLOW_EXTENSION_COMMAND', (event) => {
      const command = event.detail;
      if (!command || !['START', 'PAUSE', 'CLEAR'].includes(command.type)) return;
      chrome.runtime.sendMessage({ type: 'FOCUSFLOW_WEB_COMMAND', command }, () => {
        void chrome.runtime.lastError;
      });
    });

    // Relay overlay decisions
    window.addEventListener('FOCUSFLOW_OVERLAY_DECISION', (event) => {
      const detail = event.detail || {};
      try {
        chrome.runtime.sendMessage({
          type: 'FOCUSFLOW_OVERLAY_DECISION',
          domain: detail.domain,
          decision: detail.decision,
          videoId: detail.videoId || null,
        }, () => void chrome.runtime.lastError);
      } catch {
        // Extension context invalidated.
      }
    });

    // Receive messages from service worker and dispatch to web page
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'FOCUSFLOW_SITE_UPDATE') {
        window.dispatchEvent(
          new CustomEvent('FOCUSFLOW_CURRENT_SITE', {
            detail: JSON.stringify(message.site),
          })
        );
      }
      if (message.type === 'FOCUSFLOW_SHOW_OVERLAY') {
        window.dispatchEvent(
          new CustomEvent('FOCUSFLOW_SHOW_OVERLAY', { detail: message })
        );
      }
    });
  }

  const hasMetaTag = Boolean(document.querySelector('meta[name="focusflow-app"]'));
  const isDefaultDashboardHost =
    hasMetaTag ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('focusflow') ||
    window.location.port === '3000';

  if (isDefaultDashboardHost) {
    initDashboardBridge();
    if (hasMetaTag && window.location.protocol.startsWith('http')) {
      try {
        chrome.storage.local.get(['appUrl'], (result) => {
          if (!result?.appUrl || result.appUrl.includes('localhost')) {
            chrome.storage.local.set({ appUrl: window.location.origin });
          }
        });
      } catch (_) {}
    }
  } else {
    // Check if custom appUrl matches this host
    try {
      chrome.storage.local.get(['appUrl'], (result) => {
        if (result?.appUrl) {
          try {
            const configuredHost = new URL(result.appUrl).hostname;
            if (host === configuredHost) {
              initDashboardBridge();
            }
          } catch (_) {}
        }
      });
    } catch (_) {}
  }
})();
