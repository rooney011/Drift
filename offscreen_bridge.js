// Offscreen Bridge Script
// Bridges communication between background.js and sandboxed iframe

console.log('[OffscreenBridge] Initializing...');

const sandbox = document.getElementById('sandbox');
let pendingRequests = new Map();
let requestCounter = 0;

// Listen for messages from sandbox iframe
window.addEventListener('message', (event) => {
  const message = event.data;
  console.log('[OffscreenBridge] Received from sandbox:', message.type);
  
  if (message.type === 'MODEL_READY') {
    // Forward to background.js
    chrome.runtime.sendMessage({
      type: 'MODEL_READY',
      status: message.status,
      version: message.version,
      error: message.error
    });
  }
  else if (message.type === 'PREDICTION_RESULT') {
    // Resolve pending promise with properly formatted response
    const resolver = pendingRequests.get(message.requestId);
    if (resolver) {
      // Format response for background.js
      if (message.error) {
        resolver({ status: 'error', error: message.error });
      } else {
        resolver({ status: 'success', score: message.score });
      }
      pendingRequests.delete(message.requestId);
    }
  }
  else if (message.type === 'STATUS_RESULT') {
    const resolver = pendingRequests.get('status');
    if (resolver) {
      resolver(message);
      pendingRequests.delete('status');
    }
  }
});

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[OffscreenBridge] Received from background:', message.type);
  
  if (message.type === 'LOAD_MODEL') {
    sandbox.contentWindow.postMessage({ type: 'LOAD_MODEL' }, '*');
    sendResponse({ status: 'initiated' });
  }
  else if (message.type === 'PREDICT') {
    const requestId = ++requestCounter;
    
    // Store promise resolver
    const promise = new Promise((resolve) => {
      pendingRequests.set(requestId, resolve);
    });
    
    // Send to sandbox
    sandbox.contentWindow.postMessage({
      type: 'PREDICT',
      requestId: requestId,
      data: message.data
    }, '*');
    
    // Wait for response and send back
    promise.then((result) => {
      sendResponse(result);
    });
    
    return true; // Keep channel open for async response
  }
  else if (message.type === 'CHECK_STATUS') {
    const promise = new Promise((resolve) => {
      pendingRequests.set('status', resolve);
    });
    
    sandbox.contentWindow.postMessage({ type: 'CHECK_STATUS' }, '*');
    
    promise.then((result) => {
      sendResponse(result);
    });
    
    return true;
  }
});

// Wait for iframe to load then trigger model loading
sandbox.addEventListener('load', () => {
  console.log('[OffscreenBridge] Sandbox iframe loaded');
  // Model loading is auto-triggered in sandbox.js
});

console.log('[OffscreenBridge] Ready');
