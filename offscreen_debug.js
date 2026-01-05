// MINIMAL DEBUG SCRIPT
console.log('OFFSCREEN_DEBUG: Script loaded');

// Basic message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('OFFSCREEN_DEBUG: Received message', message);
  sendResponse({ status: 'alive' });
  return true;
});

// Notify background immediately
try {
  chrome.runtime.sendMessage({
    type: 'OFFSCREEN_LOG',
    logType: 'log',
    message: 'OFFSCREEN_DEBUG: Initialized and ready'
  });
} catch (e) {
  console.error('OFFSCREEN_DEBUG: Failed to send init message', e);
}
