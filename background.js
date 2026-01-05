// Drift Background Service Worker - AI-Powered with Offscreen Document
// Manifest V3 with TensorFlow.js running in offscreen context

// ========== State Variables ==========
let tabSwitchCount = 0; // Track tab switches per minute
let isBrowserFocused = true; // Track if user is in Chrome or away
let lastBehavior = {
  scrollVelocity: 0,
  isHoveringTop: false,
  avgTypingInterval: 0,
  backspaceCount: 0
};
let lastActiveTabId = null;

// AI Model variables
let featureHistory = []; // Rolling window of 10 feature vectors
const FEATURE_WINDOW_SIZE = 10;
const AI_THRESHOLD = 0.6; // Prediction threshold

// Offscreen document state
let offscreenDocumentCreated = false;
let modelReady = false;

const ALARM_NAME = 'drift-analysis-alarm';
const ALARM_INTERVAL_MINUTES = 1;
const MAX_HISTORY_ENTRIES = 1000;

// ========== Offscreen Document Management ==========
async function setupOffscreenDocument() {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (existingContexts.length > 0) {
    console.log('Drift: Offscreen document already exists');
    offscreenDocumentCreated = true;
    return;
  }
  
  // Create offscreen document
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS'],
      justification: 'Run TensorFlow.js for AI-powered attention prediction'
    });
    
    offscreenDocumentCreated = true;
    console.log('Drift: Offscreen document created');
    
    // Wait for scripts to load before sending messages
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Load the model
    await loadModel();
    
  } catch (error) {
    if (error.message.includes('Only a single offscreen document may be created')) {
        console.log('Drift: Offscreen document already existed (race condition handled)');
        offscreenDocumentCreated = true;
        // Model already loading from another instance, skip duplicate call
    } else {
        console.error('Drift: Failed to create offscreen document:', error);
    }
  }
}

// ========== Load AI Model via Offscreen ==========
let modelLoadAttempted = false;

async function loadModel() {
  if (!offscreenDocumentCreated || modelLoadAttempted) {
    if (!offscreenDocumentCreated) {
      console.log('Drift: Offscreen document not ready yet');
    }
    return;
  }
  
  modelLoadAttempted = true;
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'LOAD_MODEL'
    });
    
    if (response && response.status === 'initiated') {
      console.log('✅ Drift: Model load initiated in offscreen document');
    } else if (response && response.error) {
      console.error('❌ Drift: Model load failed:', response.error);
    }
  } catch (error) {
    console.error('❌ Drift: Error requesting model load:', error);
  }
}

// ========== Initialize Service Worker ==========
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Drift: Service worker installed', details.reason);
  
  // Create the recurring alarm
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: ALARM_INTERVAL_MINUTES
  });
  
  // Initialize storage
  chrome.storage.local.get(['focusHistory'], (result) => {
    if (!result.focusHistory) {
      chrome.storage.local.set({ focusHistory: [] });
    }
  });
  
  console.log(`Drift: Alarm set to trigger every ${ALARM_INTERVAL_MINUTES} minute(s)`);
  
  // Setup offscreen document
  setupOffscreenDocument();
});

// Re-create alarm on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: ALARM_INTERVAL_MINUTES
  });
  console.log('Drift: Alarm re-created on startup');
  setupOffscreenDocument();
});

// ========== Message Listener ==========
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BEHAVIOR_UPDATE') {
    // Save payload into lastBehavior variable
    lastBehavior = message.payload;
    
    // Debug logging
    console.log('Drift: Behavior update received', {
      scrollVelocity: lastBehavior.scrollVelocity,
      isHoveringTop: lastBehavior.isHoveringTop,
      avgTypingInterval: lastBehavior.avgTypingInterval,
      backspaceCount: lastBehavior.backspaceCount,
      timestamp: new Date().toLocaleTimeString()
    });
    
    sendResponse({ status: 'received' });
  } 
  else if (message.type === 'DEMO_TRIGGER_NOTIFICATION') {
    // Demo mode: trigger notification immediately
    console.log('Drift: Demo notification trigger received');
    triggerIntervention(0.85);
    sendResponse({ status: 'notification_triggered' });
  }
  else if (message.type === 'MODEL_READY') {
    // Offscreen document notifies when model is ready
    if (message.status === 'success') {
      modelReady = true;
      console.log('✅ Drift: AI model is ready in offscreen document');
    } else {
      console.error('❌ Drift: Model failed to load:', message.error);
    }
  }
  
  return true;
});

// ========== Tab Switch Tracking ==========
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (lastActiveTabId !== null && lastActiveTabId !== activeInfo.tabId) {
    tabSwitchCount++;
    console.log(`Drift: Tab switched - Count: ${tabSwitchCount}`);
  }
  lastActiveTabId = activeInfo.tabId;
});

// ========== Window Focus Tracking ==========
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    isBrowserFocused = false;
    console.log('Drift: User left Chrome (Idle/Away)');
  } else {
    isBrowserFocused = true;
    console.log('Drift: User returned to Chrome');
  }
});

// ========== Alarm Listener (AI-Powered Analysis) ==========
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    // Check if user is in Chrome or away
    if (!isBrowserFocused) {
      console.log('⏸️ Drift: User is Idle/Away - Skipping analysis');
      tabSwitchCount = 0;
      return;
    }
    
    // User is in Chrome - run AI prediction
    runAIPrediction();
    
    // Reset tab switch count for next minute
    tabSwitchCount = 0;
  }
});

// ========== Calculate Mouse Entropy ==========
function calculateMouseEntropy() {
  // Simple entropy calculation based on mouse hovering top
  return lastBehavior.isHoveringTop ? 0.8 : 0.2;
}

// ========== Normalize Features ==========
function normalizeFeatures(rawFeatures) {
  // Normalize each feature to 0-1 range
  return [
    Math.min(rawFeatures.tabCount / 20, 1),           // Max 20 tabs
    Math.min(rawFeatures.scrollVelocity / 200, 1),    // Max 200 px/s
    rawFeatures.mouseEntropy,                          // Already 0-1
    Math.min(rawFeatures.typingSpeed / 1000, 1),      // Max 1000ms interval
    Math.min(rawFeatures.errorRate / 20, 1)           // Max 20 backspaces/min
  ];
}

// ========== AI Prediction Engine ==========
async function runAIPrediction() {
  try {
    // Gather sensor data
    const rawFeatures = {
      tabCount: tabSwitchCount,
      scrollVelocity: lastBehavior.scrollVelocity || 0,
      mouseEntropy: calculateMouseEntropy(),
      typingSpeed: lastBehavior.avgTypingInterval || 0,
      errorRate: lastBehavior.backspaceCount || 0
    };
    
    // Normalize features
    const normalizedFeatures = normalizeFeatures(rawFeatures);
    
    // Add to feature history
    featureHistory.push(normalizedFeatures);
    
    // Keep only last 10 data points (sliding window)
    if (featureHistory.length > FEATURE_WINDOW_SIZE) {
      featureHistory.shift();
    }
    
    console.log('📊 Drift: Minute Stats:', {
      tabSwitchCount: tabSwitchCount,
      scrollVelocity: lastBehavior.scrollVelocity || 0,
      isHoveringTop: lastBehavior.isHoveringTop || false,
      avgTypingInterval: lastBehavior.avgTypingInterval || 0,
      backspaceCount: lastBehavior.backspaceCount || 0,
      featureHistoryLength: featureHistory.length,
      modelReady: modelReady,
      timestamp: new Date().toLocaleTimeString()
    });
    
    // Make prediction if we have enough data and model is ready
    if (featureHistory.length === FEATURE_WINDOW_SIZE && modelReady && offscreenDocumentCreated) {
      // Request prediction from offscreen document
      const response = await chrome.runtime.sendMessage({
        type: 'PREDICT',
        data: featureHistory  // Send as 'data' to match expected format
      });
      
      if (response && response.status === 'success') {
        const score = response.score;
        console.log(`🧠 Drift AI Score: ${score.toFixed(4)} (Threshold: ${AI_THRESHOLD})`);
        
        // Save prediction data
        const analysisData = {
          timestamp: Date.now(),
          aiScore: score,
          scrollVelocity: lastBehavior.scrollVelocity || 0,
          isHoveringTop: lastBehavior.isHoveringTop || false,
          tabSwitchCount: tabSwitchCount,
          avgTypingInterval: lastBehavior.avgTypingInterval || 0,
          backspaceCount: lastBehavior.backspaceCount || 0,
          distractionScore: score // Use AI score as distraction score
        };
        
        saveFocusHistory(analysisData);
        
        // Trigger intervention if AI predicts distraction
        if (score > AI_THRESHOLD) {
          console.log('⚠️ Drift AI: High distraction detected - Triggering intervention');
          triggerIntervention(score);
        } else {
          console.log('✅ Drift AI: User is focused');
        }
      } else {
        console.error('❌ Drift AI: Prediction failed:', response?.error);
      }
      
    } else if (!modelReady) {
      console.log('⏳ Drift AI: Model not ready yet, skipping prediction');
    } else {
      console.log(`⏳ Drift AI: Collecting data... (${featureHistory.length}/${FEATURE_WINDOW_SIZE})`);
    }
    
  } catch (error) {
    console.error('❌ Drift AI: Prediction error:', error);
  }
}

// ========== Save Focus History ==========
function saveFocusHistory(analysisData) {
  chrome.storage.local.get(['focusHistory'], (result) => {
    let history = result.focusHistory || [];
    history.push(analysisData);
    
    if (history.length > MAX_HISTORY_ENTRIES) {
      history = history.slice(-MAX_HISTORY_ENTRIES);
    }
    
    chrome.storage.local.set({ focusHistory: history }, () => {
      console.log(`Drift: Focus history saved (${history.length} entries)`);
    });
  });
}

// ========== Trigger Intervention Notification ==========
function triggerIntervention(score) {
  const scorePercent = Math.round(score * 100);
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Drift 🧠',
    message: `Focus drifting? Take a break! (AI Score: ${scorePercent}%)`,
    priority: 2
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('Drift: Notification error', chrome.runtime.lastError);
    } else {
      console.log('Drift: Intervention notification sent', notificationId);
    }
  });
}

console.log('Drift AI: Background service worker initialized');
console.log('Setting up offscreen document for TensorFlow.js...');
setupOffscreenDocument();
