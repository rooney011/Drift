// Offscreen script for TensorFlow.js
// Runs in offscreen context with relaxed CSP Use

// Proxy console logs to background for debugging
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

function logToBackground(type, args) {
  // Convert args to string to ensure message passing works
  const message = args.map(arg => {
      try {
          return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
      } catch (e) {
          return String(arg);
      }
  }).join(' ');

  chrome.runtime.sendMessage({
    type: 'OFFSCREEN_LOG',
    logType: type,
    message: message
  }).catch(() => {}); // Ignore errors if background isn't listening
}

console.log = function(...args) {
  originalConsoleLog.apply(console, args);
  logToBackground('log', args);
};

console.error = function(...args) {
  originalConsoleError.apply(console, args);
  logToBackground('error', args);
};

console.log('Drift AI Offscreen: Initializing...');

// AI Model variables
let model = null;
let isModelLoading = false;
let isModelReady = false;

// Wait for TensorFlow.js to load fully (wait for version prop)
function waitForTensorFlow(retries = 100) { // 10 seconds timeout
  return new Promise((resolve, reject) => {
    const check = () => {
      // Key fix: TFJS initialization starts by creating window.tf = {}. 
      // We must wait until it populates with actual methods (e.g. version).
      if (typeof tf !== 'undefined' && tf.version) {
        console.log('TensorFlow.js loaded and populated. Version:', tf.version.tfjs);
        
        console.log('TF Debug check: tf.layers is', typeof tf.layers);
        console.log('TF Keys sample:', Object.keys(tf).slice(0, 10));
        
        resolve();
      } else if (retries > 0) {
        retries--;
        // Exponential backoff or simple poll
        setTimeout(check, 100);
      } else {
        // If we have tf but no version, print what we have
        if (typeof tf !== 'undefined') {
          console.error('TF object exists but incomplete:', Object.keys(tf));
        }
        reject(new Error('Timeout waiting for TensorFlow.js to initialize'));
      }
    };
    check();
  });
}

// ========== Load AI Model ==========
async function loadDriftModel() {
  if (isModelLoading || isModelReady) return;
  
  try {
    isModelLoading = true;
    
    // Wait for TensorFlow.js to be available
    await waitForTensorFlow();
    
    // Check available loading methods
    let loadFn = null;
    let loadType = '';

    console.log('TF Debug check: tf.layers is', typeof tf.layers);

    if (typeof tf.loadLayersModel === 'function') {
      loadFn = tf.loadLayersModel;
      loadType = 'layers';
      console.log('Using tf.loadLayersModel');
    } else if (typeof tf.loadGraphModel === 'function') {
      loadFn = tf.loadGraphModel;
      loadType = 'graph';
      console.log('Using tf.loadGraphModel (fallback)');
    } else if (typeof tf.loadModel === 'function') {
      loadFn = tf.loadModel;
      loadType = 'legacy';
      console.log('Using fallback tf.loadModel');
    } else {
      const keys = Object.keys(tf).filter(k => k.includes('load') || k.includes('Model'));
      throw new Error(`No load function found! Keys: ${keys.join(', ')}`);
    }

    console.log('🧠 Drift AI: Loading model from models/model.json...');
    // Note: offscreen.html is at root, so models/model.json is correct relative path
    model = await loadFn('models/model.json');
    isModelReady = true;
    isModelLoading = false;
    
    console.log('✅ Drift AI: Model loaded successfully!');
    
    // Notify background that model is ready
    chrome.runtime.sendMessage({
      type: 'MODEL_READY',
      status: 'success',
      version: tf.version.tfjs
    });
    
  } catch (error) {
    isModelLoading = false;
    isModelReady = false;
    
    console.error('❌ Drift AI: Failed to load model:', error);
    
    // Notify background of failure with details
    chrome.runtime.sendMessage({
      type: 'MODEL_READY',
      status: 'error',
      error: error.message
    });
  }
}

// Initialize immediately
loadDriftModel();

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Drift AI Offscreen: Received message', message.type);
  
  if (message.type === 'PREDICT') {
    if (!model || !isModelReady) {
      console.warn('⚠️ Prediction requested but model not ready');
      sendResponse({ error: 'Model not ready' });
      return;
    }
    
    try {
      const inputData = message.data;
      // Convert input to tensor
      const tensor = tf.tensor2d([inputData]); // Batch size 1
      
      // Run prediction
      const prediction = model.predict(tensor);
      const score = prediction.dataSync()[0]; // Get scalar value
      
      // Clean up tensors
      tensor.dispose();
      prediction.dispose();
      
      console.log(`Prediction result: ${score.toFixed(4)}`);
      sendResponse({ score: score });
      
    } catch (err) {
      console.error('Prediction error:', err);
      sendResponse({ error: err.message });
    }
  } else if (message.type === 'CHECK_STATUS') {
    sendResponse({ 
      isReady: isModelReady, 
      isLoading: isModelLoading 
    });
  } else if (message.type === 'LOAD_MODEL') {
    loadDriftModel()
      .then(() => {
        sendResponse({ status: 'success', ready: isModelReady });
      })
      .catch((error) => {
        sendResponse({ status: 'error', error: error.message });
      });
    return true; // Keep channel open for async response
  }
});
