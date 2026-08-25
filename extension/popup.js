document.addEventListener('DOMContentLoaded', () => {
  const scoreValue = document.getElementById('scoreValue');
  const tabSwitches = document.getElementById('tabSwitches');
  const idleTime = document.getElementById('idleTime');
  const openDashboardBtn = document.getElementById('openDashboardBtn');
  const resetSessionBtn = document.getElementById('resetSessionBtn');

  // Load metrics from chrome storage
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['tabSwitchCount', 'idleTimeSeconds'], (result) => {
      const switches = result.tabSwitchCount || 0;
      const idle = result.idleTimeSeconds || 0;
      
      tabSwitches.textContent = switches;
      idleTime.textContent = `${idle}s`;

      const score = Math.max(0, 100 - (switches * 4) - Math.floor(idle / 10));
      scoreValue.textContent = score;
    });
  }

  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  });

  resetSessionBtn.addEventListener('click', () => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ tabSwitchCount: 0, idleTimeSeconds: 0 }, () => {
        tabSwitches.textContent = '0';
        idleTime.textContent = '0s';
        scoreValue.textContent = '100';
      });
    }
  });
});
