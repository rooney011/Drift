// Offscreen initialization - MUST run before any other scripts
console.log('[Init] Offscreen initializing...');

// Global error handler
window.onerror = function(msg, url, line) {
  console.error('[Init] Global Error:', msg, url, line);
  try {
    chrome.runtime.sendMessage({
      type: 'MODEL_READY', 
      status: 'error', 
      error: 'Global Error: ' + msg
    });
  } catch(e) {}
};

// FORCE global scope for UMD loader
// Prevents TFJS from attaching to 'exports' or 'module' if they exist
console.log('[Init] Forcing UMD global scope...');
window.exports = undefined;
window.module = undefined;
window.define = undefined;

console.log('[Init] Environment prepared for TensorFlow.js');
