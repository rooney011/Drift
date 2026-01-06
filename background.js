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
let featureHistory = []; // Rolling window of features
const FEATURE_WINDOW_SIZE = 10; // 10 = Production (uses last 10 samples)

// Dynamic AI threshold based on sensitivity setting
let AI_THRESHOLD = 0.6; // Default: Balanced

// Threshold mappings
const SENSITIVITY_THRESHOLDS = {
  low: 0.8,      // Zen Mode - only trigger on very high distraction
  balanced: 0.6, // Default - moderate trigger
  high: 0.4      // Drill Sergeant - trigger easily
};

// Gamification: Focus Streak
let focusMinutes = 0; // Track consecutive minutes of focus

// Offscreen document state
let offscreenDocumentCreated = false;
let modelReady = false;

const ALARM_NAME = 'drift-analysis-alarm';
const ALARM_INTERVAL_MINUTES = 1.0; // Production: 1 minute
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
  // ...
  
  // Initialize storage
  chrome.storage.local.get(['focusHistory', 'featureHistory'], (result) => {
    if (!result.focusHistory) {
      chrome.storage.local.set({ focusHistory: [] });
    }
    // Restore feature history to survive reloads
    if (result.featureHistory) {
        featureHistory = result.featureHistory;
        console.log(`Drift: Restored ${featureHistory.length} feature vectors`);
    }
  });
  
  // ...
});

// ========== Alarm Listener (AI-Powered Analysis) ==========
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    // Debug: Ignore focus check so it runs even if you're looking at VS Code
    /* 
    if (!isBrowserFocused) {
      console.log('⏸️ Drift: User is Idle/Away - Skipping analysis');
      tabSwitchCount = 0;
      return;
    }
    */
    
    // User is in Chrome - run AI prediction
    runAIPrediction();
    
    // Reset tab switch count for next minute
    tabSwitchCount = 0;
  }
});

// ========== Calculate Mouse Entropy ==========
function calculateMouseEntropy() {
  // Use real entropy calculated by content script
  // If not available (old version), fallback to hover check
  if (lastBehavior.mouseEntropy !== undefined) {
    return lastBehavior.mouseEntropy;
  }
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
    chrome.storage.local.set({ featureHistory: featureHistory });
    
    // Keep only last 1 data point (FAST DEBUGGING MODE)
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
        
        // ========== Focus Streak Tracking ==========
        if (score < AI_THRESHOLD) {
          // User is focused - increment streak
          focusMinutes++;
          const streakHours = Math.floor(focusMinutes / 60);
          console.log(`🔥 Drift: Focus streak! ${focusMinutes} minutes (${streakHours} hours)`);
          
          // Save to storage
          chrome.storage.local.set({ focusMinutes: focusMinutes }, () => {
            console.log(`Drift: Focus streak saved (${focusMinutes} min)`);
          });
        } else {
          // User is distracted - reset streak
          if (focusMinutes > 0) {
            const lostStreak = focusMinutes;
            console.log(`💔 Drift: Streak broken at ${lostStreak} minutes`);
          }
          focusMinutes = 0;
          chrome.storage.local.set({ focusMinutes: 0 });
        }
        
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

// Trigger distraction intervention (Overlay Mode)
function triggerIntervention(score) {
  const scorePercent = (score * 100).toFixed(1);
  console.log(`🚨 Drift: Triggering intervention overlay for score ${scorePercent}%`);

  // Send message to active tab to show overlay
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
       chrome.tabs.sendMessage(tabs[0].id, {
         type: 'TRIGGER_INTERVENTION',
         score: score
       }).catch(err => console.log('Drift: Could not send to tab (maybe restricted URL):', err));
    } else {
      console.log('Drift: No active tab to show intervention on');
    }
  });
}

// Listen for notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'drift-intervention') {
    console.log('Drift: Notification clicked, opening break page');
    
    // Open break.html as a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('break.html'),
      active: true
    });
    
    // Clear the notification
    chrome.notifications.clear(notificationId);
  }
});

console.log('Drift AI: Background service worker initialized');
console.log('Setting up offscreen document for TensorFlow.js...');
setupOffscreenDocument();

// Initialize focus streak from storage
chrome.storage.local.get(['focusMinutes', 'sensitivity'], (result) => {
  if (result.focusMinutes !== undefined) {
    focusMinutes = result.focusMinutes;
    const streakHours = Math.floor(focusMinutes / 60);
    console.log(`🔥 Drift: Loaded focus streak: ${focusMinutes} minutes (${streakHours} hours)`);
  }
  
  // Load sensitivity setting
  if (result.sensitivity) {
    AI_THRESHOLD = SENSITIVITY_THRESHOLDS[result.sensitivity] || 0.6;
    console.log(`⚙️ Drift: Loaded sensitivity: ${result.sensitivity} (threshold: ${AI_THRESHOLD})`);
  } else {
    // Set default
    chrome.storage.local.set({ sensitivity: 'balanced' });
    console.log('⚙️ Drift: Using default sensitivity: balanced (threshold: 0.6)');
  }
});

// ========== Listen for Settings Changes ==========
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.sensitivity) {
    const newSensitivity = changes.sensitivity.newValue;
    AI_THRESHOLD = SENSITIVITY_THRESHOLDS[newSensitivity] || 0.6;
    console.log(`⚙️ Drift: Updated sensitivity to ${newSensitivity} (threshold: ${AI_THRESHOLD})`);
  }
});
