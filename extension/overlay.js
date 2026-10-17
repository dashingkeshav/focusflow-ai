// FocusFlow AI — Warning overlay (content script, injected on demand)
// Shown on possibly_productive sites: "Could this help with your current task?"
// Runs in MAIN world via chrome.scripting; does not read page inputs.

(() => {
  if (window.__focusflowOverlayLoaded) return;
  window.__focusflowOverlayLoaded = true;

  let overlayRoot = null;

  function removeOverlay() {
    if (overlayRoot && overlayRoot.parentNode) {
      overlayRoot.parentNode.removeChild(overlayRoot);
    }
    overlayRoot = null;
  }

  function buildOverlay(domain, taskTitle, reason, remainingSeconds, isYouTube, videoId) {
    const wrap = document.createElement('div');
    wrap.id = 'focusflow-warning-overlay';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'FocusFlow check-in');
    wrap.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:rgba(5,5,8,0.85)', 'backdrop-filter:blur(12px)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'color:#e5e7eb', 'padding:24px',
    ].join(';');

    const mins = Math.max(0, Math.floor((remainingSeconds || 0) / 60));
    const card = document.createElement('div');
    card.style.cssText = [
      'max-width:440px', 'width:100%', 'background:#0a0a0d',
      'border:1px solid rgba(255,69,0,0.3)', 'border-radius:22px',
      'padding:32px', 'text-align:center',
      'box-shadow:0 24px 60px -20px rgba(0,0,0,0.9), 0 0 30px rgba(255,69,0,0.1)',
    ].join(';');

    const badge = document.createElement('div');
    badge.textContent = '● FOCUS PROTECTION ACTIVE';
    badge.style.cssText = 'font-size:11px;letter-spacing:0.14em;color:#FF4500;font-weight:700;margin-bottom:18px;';
    card.appendChild(badge);

    const title = document.createElement('h2');
    title.textContent = 'Could this help with your current task?';
    title.style.cssText = 'font-size:19px;font-weight:700;color:#fff;margin:0 0 10px;';
    card.appendChild(title);

    const task = document.createElement('p');
    task.textContent = taskTitle ? `You are working on: “${taskTitle}”` : 'You have an active focus session.';
    task.style.cssText = 'font-size:13px;color:#9ca3af;margin:0 0 14px;line-height:1.5;';
    card.appendChild(task);

    const site = document.createElement('div');
    site.textContent = domain;
    site.style.cssText = [
      'display:inline-block', 'font-family:ui-monospace,monospace', 'font-size:13px',
      'font-weight:700', 'color:#fde68a', 'background:rgba(253,230,138,0.12)',
      'border:1px solid rgba(253,230,138,0.3)', 'border-radius:8px',
      'padding:6px 14px', 'margin-bottom:10px',
    ].join(';');
    card.appendChild(site);

    const reasonEl = document.createElement('p');
    reasonEl.textContent = reason || 'FocusFlow could not confirm this site helps your task.';
    reasonEl.style.cssText = 'font-size:12px;color:#9ca3af;margin:0 0 6px;line-height:1.5;';
    card.appendChild(reasonEl);

    const time = document.createElement('p');
    time.textContent = `Session time remaining: ${mins} min`;
    time.style.cssText = 'font-size:11px;color:#6b7280;margin:0 0 22px;';
    card.appendChild(time);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

    const mkBtn = (label, decision, primary, accent) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = [
        'padding:12px 18px', 'border-radius:12px', 'font-size:13px', 'font-weight:700',
        'cursor:pointer', 'border:1px solid ' + accent,
        primary ? `background:${accent};color:#ffffff;` : 'background:rgba(255,255,255,0.04);color:#e5e7eb;',
      ].join(';');
      btn.addEventListener('click', () => {
        removeOverlay();
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          try {
            chrome.runtime.sendMessage({
              type: 'FOCUSFLOW_OVERLAY_DECISION',
              domain,
              decision,
              videoId: videoId || null,
            });
          } catch (_) {}
        }
        window.dispatchEvent(
          new CustomEvent('FOCUSFLOW_OVERLAY_DECISION', { detail: { domain, decision, videoId } })
        );
      });
      return btn;
    };

    if (isYouTube && videoId) {
      btnRow.appendChild(mkBtn('Allow this video for this session', 'allow_video', true, '#FF4500'));
    }
    btnRow.appendChild(mkBtn('Continue for 10 min', 'continue', !isYouTube, '#FF4500'));
    btnRow.appendChild(mkBtn('Block this site for this session', 'block', false, 'rgba(253,164,175,0.4)'));
    btnRow.appendChild(mkBtn('Return to Focus', 'return', false, 'rgba(255,255,255,0.2)'));
    card.appendChild(btnRow);

    const footer = document.createElement('p');
    footer.textContent = 'FocusFlow Smart Focus — assistive protection for deep work.';
    footer.style.cssText = 'font-size:10px;color:#52525b;margin:18px 0 0;';
    card.appendChild(footer);

    wrap.appendChild(card);
    return wrap;
  }

  function handleOverlayRequest(data) {
    if (!data) return;
    removeOverlay();
    overlayRoot = buildOverlay(
      data.domain,
      data.taskTitle,
      data.reason,
      data.remainingSeconds,
      Boolean(data.isYouTube),
      data.videoId || null
    );
    (document.body || document.documentElement).appendChild(overlayRoot);
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message && message.type === 'FOCUSFLOW_SHOW_OVERLAY') {
        handleOverlayRequest(message);
      }
    });
  }

  window.addEventListener('FOCUSFLOW_SHOW_OVERLAY', (event) => {
    handleOverlayRequest(event.detail);
  });
})();
