// Drift Content Script - Privacy-First Behavior Tracking
// Tracks scroll velocity, mouse position, and typing patterns

(function() {
  'use strict';

  // ========== State Variables ==========
  let scrollVelocities = []; // Store scroll velocities
  let previousScrollY = window.scrollY;
  let isHoveringTop = false; // Track if mouse is near top
  
  // Typing tracking
  let lastKeystrokeTime = null;
  let typingIntervals = []; // Time between keystrokes
  let backspaceCount = 0;

  const TOP_HOVER_THRESHOLD = 50; // pixels from top
  const UPDATE_INTERVAL = 2000; // 2 seconds (for testing)

  // ========== Scroll Tracking ==========
  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    
    // Calculate scroll velocity (absolute difference)
    const scrollVelocity = Math.abs(currentScrollY - previousScrollY);
    
    // Store in array
    scrollVelocities.push(scrollVelocity);
    
    // Update previous position
    previousScrollY = currentScrollY;
  }, { passive: true });

  // ========== Mouse Tracking ==========
  window.addEventListener('mousemove', (event) => {
    // Detect if mouse is hovering near the top
    isHoveringTop = event.clientY < TOP_HOVER_THRESHOLD;
  }, { passive: true });

  // ========== Typing Sensor (Privacy-First) ==========
  window.addEventListener('keydown', (event) => {
    const currentTime = Date.now();
    
    // Track Backspace for error rate (ONLY key we identify)
    if (event.key === 'Backspace') {
      backspaceCount++;
    }
    
    // Measure typing speed (interval between ANY keystrokes)
    if (lastKeystrokeTime !== null) {
      const interval = currentTime - lastKeystrokeTime;
      // Only track reasonable intervals (10ms to 5000ms to filter out noise)
      if (interval >= 10 && interval <= 5000) {
        typingIntervals.push(interval);
      }
    }
    
    // Update last keystroke time
    lastKeystrokeTime = currentTime;
  }, { passive: true });

  // ========== Data Transmission (Every 2 Seconds) ==========
  setInterval(() => {
    // Calculate average scroll velocity
    let averageScrollVelocity = 0;
    if (scrollVelocities.length > 0) {
      const sum = scrollVelocities.reduce((acc, val) => acc + val, 0);
      averageScrollVelocity = sum / scrollVelocities.length;
    }
    
    // Calculate average typing interval
    let avgTypingInterval = 0;
    if (typingIntervals.length > 0) {
      const sumIntervals = typingIntervals.reduce((acc, val) => acc + val, 0);
      avgTypingInterval = sumIntervals / typingIntervals.length;
    }
    
    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'BEHAVIOR_UPDATE',
      payload: {
        scrollVelocity: averageScrollVelocity,
        isHoveringTop: isHoveringTop,
        avgTypingInterval: avgTypingInterval,
        backspaceCount: backspaceCount
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Extension might be reloading, silently handle
        console.debug('Drift: Message send failed', chrome.runtime.lastError.message);
      } else {
        console.log('Drift: Behavior data sent', {
          scrollVelocity: averageScrollVelocity.toFixed(2),
          isHoveringTop: isHoveringTop,
          avgTypingInterval: avgTypingInterval.toFixed(0),
          backspaceCount: backspaceCount
        });
      }
    });
    
    // Reset counters for next interval
    scrollVelocities = [];
    typingIntervals = [];
    backspaceCount = 0;
    
  }, UPDATE_INTERVAL);

  console.log('Drift: Content script initialized - Tracking scroll, mouse, and typing every 2 seconds');
})();
