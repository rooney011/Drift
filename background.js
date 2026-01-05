// Drift Background Service Worker - Manifest V3
// Uses chrome.alarms API instead of setInterval

// ========== State Variables ==========
let currentBehavior = {
  scrollVelocity: 0,
  isScrollErratic: false,
  isHoveringTop: false,
  timestamp: null
};

let tabSwitchCount = 0;
let lastActiveTabId = null;

const ALARM_NAME = 'drift-analysis-alarm';
const ALARM_INTERVAL_MINUTES = 1;
const DISTRACTION_THRESHOLD = 0.7;
const MAX_HISTORY_ENTRIES = 1000; // Limit history to prevent storage issues

// ========== Initialize Service Worker ==========
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Drift: Service worker installed', details.reason);

  // Create the recurring alarm
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: ALARM_INTERVAL_MINUTES
  });

  // Initialize storage and check onboarding
  chrome.storage.local.get(['focusHistory', 'onboardingCompleted'], (result) => {
    if (!result.focusHistory) {
      chrome.storage.local.set({ focusHistory: [] });
    }

    // Open welcome page on first install
    if (details.reason === 'install' && !result.onboardingCompleted) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('welcome.html')
      });
    }
  });

  console.log(`Drift: Alarm set to trigger every ${ALARM_INTERVAL_MINUTES} minute(s)`);
});

// Re-create alarm on startup (in case it was cleared)
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: ALARM_INTERVAL_MINUTES
  });
  console.log('Drift: Alarm re-created on startup');
});

// ========== Message Listener (from content.js and popup.js) ==========
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BEHAVIOR_UPDATE') {
    // Store the latest behavior data from content script
    currentBehavior = {
      scrollVelocity: message.scrollVelocity || 0,
      isScrollErratic: message.isScrollErratic || false,
      isHoveringTop: message.isHoveringTop || false,
      timestamp: message.timestamp || Date.now()
    };

    console.log('Drift: Behavior update received', currentBehavior);
    sendResponse({ status: 'received' });
  } else if (message.type === 'DEMO_TRIGGER_NOTIFICATION') {
    // Demo mode: trigger notification immediately
    console.log('Drift: Demo notification trigger received');
    triggerIntervention(0.85); // High distraction score for demo
    sendResponse({ status: 'notification_triggered' });
  } else if (message.action === 'TRIGGER_DEMO_ALERT') {
    // New demo trigger with interactive notification
    console.log('Drift: Creating interactive demo notification');

    chrome.notifications.create('drift-demo-alert', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Drift 🧠',
      message: 'Focus drifting? Take a 30s break now! Click to start.',
      priority: 2
      // Removed requireInteraction - causes issues on macOS
    }, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Drift: Notification error', chrome.runtime.lastError);
        sendResponse({ status: 'error', error: chrome.runtime.lastError.message });
      } else {
        console.log('Drift: Interactive notification created:', notificationId);
        console.log('Drift: If notification not visible, check macOS Focus/DND settings');
        sendResponse({ status: 'notification_created', id: notificationId });
      }
    });
  }

  return true; // Keep message channel open for async response
});

// ========== Notification Click Listener ==========
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Drift: Notification clicked', notificationId);

  // Open break.html in a popup window (not a tab)
  const breakUrl = chrome.runtime.getURL('break.html');

  chrome.windows.create({
    url: breakUrl,
    type: 'popup',
    width: 450,
    height: 600,
    focused: true
  }, (window) => {
    if (chrome.runtime.lastError) {
      console.error('Drift: Failed to open popup window', chrome.runtime.lastError);
    } else {
      console.log('Drift: Break popup window opened', window.id);
    }
  });

  // Clear the notification immediately
  chrome.notifications.clear(notificationId, (wasCleared) => {
    console.log('Drift: Notification cleared', wasCleared);
  });
});

// ========== Tab Switch Tracking ==========
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (lastActiveTabId !== null && lastActiveTabId !== activeInfo.tabId) {
    tabSwitchCount++;
  }
  lastActiveTabId = activeInfo.tabId;
});

// ========== Alarm Listener (Analysis & Intervention) ==========
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('Drift: Alarm triggered - analyzing behavior');
    analyzeAndIntervene();
  }
});

// ========== Core Analysis Logic ==========
function analyzeAndIntervene() {
  // Calculate distraction score based on behavior metrics
  const distractionScore = calculateDistractionScore(currentBehavior, tabSwitchCount);

  const analysisData = {
    timestamp: Date.now(),
    distractionScore: distractionScore,
    scrollVelocity: currentBehavior.scrollVelocity,
    isScrollErratic: currentBehavior.isScrollErratic,
    isHoveringTop: currentBehavior.isHoveringTop,
    tabSwitchCount: tabSwitchCount
  };

  console.log('Drift: Analysis complete', analysisData);

  // Save to focus history
  saveFocusHistory(analysisData);

  // Intervention if distraction is high
  if (distractionScore > DISTRACTION_THRESHOLD) {
    triggerIntervention(distractionScore);
  }

  // Reset tab switch counter for next interval
  tabSwitchCount = 0;
}

// ========== Distraction Score Calculation ==========
function calculateDistractionScore(behavior, tabSwitches) {
  let score = 0;

  // Factor 1: Scroll Velocity (normalize to 0-0.4 range)
  // High velocity (>1 px/ms) suggests rapid scrolling/scanning
  const velocityScore = Math.min(behavior.scrollVelocity * 0.4, 0.4);
  score += velocityScore;

  // Factor 2: Erratic Scrolling (0.3 points if true)
  // Rapid direction changes indicate distraction/searching
  if (behavior.isScrollErratic) {
    score += 0.3;
  }

  // Factor 3: Top Hovering (0.2 points if true)
  // Mouse near tabs/URL bar suggests tab checking
  if (behavior.isHoveringTop) {
    score += 0.2;
  }

  // Factor 4: Tab Switching (normalize to 0-0.3 range)
  // More than 5 switches in 1 minute is high
  const tabSwitchScore = Math.min(tabSwitches / 15, 0.3);
  score += tabSwitchScore;

  // Clamp to 0.0 - 1.0 range
  return Math.min(Math.max(score, 0), 1);
}

// ========== Save to Storage ==========
function saveFocusHistory(analysisData) {
  chrome.storage.local.get(['focusHistory'], (result) => {
    let history = result.focusHistory || [];

    // Add new entry
    history.push(analysisData);

    // Limit history size
    if (history.length > MAX_HISTORY_ENTRIES) {
      history = history.slice(-MAX_HISTORY_ENTRIES);
    }

    // Save back to storage
    chrome.storage.local.set({ focusHistory: history }, () => {
      console.log(`Drift: Focus history saved (${history.length} entries)`);
    });
  });
}

// ========== Intervention Notification ==========
function triggerIntervention(score) {
  const scorePercent = Math.round(score * 100);

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Drift',
    message: `Focus drifting? Do 5 jumping jacks! (Distraction: ${scorePercent}%)`,
    priority: 2
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('Drift: Notification error', chrome.runtime.lastError);
    } else {
      console.log('Drift: Intervention notification sent', notificationId);
    }
  });
}

// ========== Debug: Listen for alarms to verify they're working ==========
chrome.alarms.getAll((alarms) => {
  console.log('Drift: Active alarms', alarms);
});

console.log('Drift: Background service worker initialized');
