// Drift Content Script - Privacy-First Behavior Tracking
// Only tracks scroll patterns and mouse position, NO text logging

(function() {
  'use strict';

  // ========== State Variables ==========
  let scrollHistory = [];
  let lastScrollY = window.scrollY;
  let lastScrollTime = Date.now();
  let isHoveringTop = false;
  
  const SCROLL_HISTORY_LIMIT = 10; // Keep last 10 scroll measurements
  const UPDATE_INTERVAL = 30000; // 30 seconds in milliseconds
  const TOP_HOVER_THRESHOLD = 50; // pixels from top

  // ========== Scroll Monitor ==========
  function trackScroll() {
    const currentScrollY = window.scrollY;
    const currentTime = Date.now();
    
    // Calculate time delta
    const timeDelta = currentTime - lastScrollTime;
    
    // Only calculate if enough time has passed (avoid division by zero)
    if (timeDelta > 0) {
      // Calculate scroll distance and velocity
      const scrollDistance = currentScrollY - lastScrollY;
      const velocity = Math.abs(scrollDistance / timeDelta); // pixels per millisecond
      
      // Store in history with direction
      scrollHistory.push({
        velocity: velocity,
        direction: scrollDistance > 0 ? 'down' : scrollDistance < 0 ? 'up' : 'none',
        timestamp: currentTime
      });
      
      // Keep history limited
      if (scrollHistory.length > SCROLL_HISTORY_LIMIT) {
        scrollHistory.shift();
      }
    }
    
    // Update last scroll position and time
    lastScrollY = currentScrollY;
    lastScrollTime = currentTime;
  }

  // Calculate average scroll velocity and detect erratic behavior
  function calculateScrollMetrics() {
    if (scrollHistory.length === 0) {
      return {
        averageVelocity: 0,
        isErratic: false
      };
    }
    
    // Calculate average velocity
    const totalVelocity = scrollHistory.reduce((sum, entry) => sum + entry.velocity, 0);
    const averageVelocity = totalVelocity / scrollHistory.length;
    
    // Detect erratic scrolling (rapid direction changes)
    let directionChanges = 0;
    for (let i = 1; i < scrollHistory.length; i++) {
      if (scrollHistory[i].direction !== scrollHistory[i - 1].direction && 
          scrollHistory[i].direction !== 'none' && 
          scrollHistory[i - 1].direction !== 'none') {
        directionChanges++;
      }
    }
    
    // Consider erratic if more than 50% of scrolls are direction changes
    const isErratic = scrollHistory.length > 3 && 
                     (directionChanges / (scrollHistory.length - 1)) > 0.5;
    
    return {
      averageVelocity: averageVelocity,
      isErratic: isErratic
    };
  }

  // ========== Mouse Monitor ==========
  function trackMousePosition(event) {
    // Check if mouse is hovering near the top of the browser
    isHoveringTop = event.clientY < TOP_HOVER_THRESHOLD;
  }

  // ========== Send Behavior Update ==========
  function sendBehaviorUpdate() {
    const scrollMetrics = calculateScrollMetrics();
    
    const behaviorData = {
      type: 'BEHAVIOR_UPDATE',
      scrollVelocity: scrollMetrics.averageVelocity,
      isScrollErratic: scrollMetrics.isErratic,
      isHoveringTop: isHoveringTop,
      timestamp: Date.now()
    };
    
    // Send message to background script
    chrome.runtime.sendMessage(behaviorData, (response) => {
      if (chrome.runtime.lastError) {
        // Silently handle errors (extension might be reloading)
        console.debug('Drift: Message send failed', chrome.runtime.lastError.message);
      }
    });
    
    // Reset scroll history after sending (start fresh for next interval)
    scrollHistory = [];
  }

  // ========== Event Listeners ==========
  
  // Scroll event with debouncing
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(trackScroll, 100); // Debounce to avoid excessive calculations
  }, { passive: true });

  // Mouse movement event with throttling
  let lastMouseTrack = 0;
  window.addEventListener('mousemove', (event) => {
    const now = Date.now();
    if (now - lastMouseTrack > 200) { // Throttle to every 200ms
      trackMousePosition(event);
      lastMouseTrack = now;
    }
  }, { passive: true });

  // ========== Periodic Updates ==========
  
  // Send initial update after page load
  setTimeout(sendBehaviorUpdate, 5000); // Wait 5 seconds after page load
  
  // Send updates every 30 seconds
  setInterval(sendBehaviorUpdate, UPDATE_INTERVAL);

  console.log('Drift: Content script initialized - Privacy-first behavior tracking active');
})();
