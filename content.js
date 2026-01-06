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

  // ========== Mouse Tracking (Entropy/Jitter) ==========
  let mousePath = []; // Store [x, y] coordinates
  let mouseDistance = 0; // Total distance traveled
  
  window.addEventListener('mousemove', (event) => {
    const x = event.clientX;
    const y = event.clientY;
    const timestamp = Date.now();
    
    // Detect if mouse is hovering near top (for tab switching intent)
    isHoveringTop = y < TOP_HOVER_THRESHOLD;

    // Track path for entropy calculation
    if (mousePath.length > 0) {
      const lastPoint = mousePath[mousePath.length - 1];
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      mouseDistance += dist;
    }
    
    mousePath.push({ x, y, timestamp });
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
    
    // Calculate Mouse Entropy (Tortuosity: Distance / Displacement)
    let mouseEntropy = 0;
    if (mousePath.length > 1) {
      const firstPoint = mousePath[0];
      const lastPoint = mousePath[mousePath.length - 1];
      const displacementX = lastPoint.x - firstPoint.x;
      const displacementY = lastPoint.y - firstPoint.y;
      // Avoid division by zero by adding 1 pixel to displacement
      const displacement = Math.sqrt(displacementX * displacementX + displacementY * displacementY) + 1;
      
      // Entropy ratio (Higher = more jittery/indirect)
      // Normal straight movement ~= 1.0
      // Shakey movement >> 1.0
      const entropyRatio = mouseDistance / displacement;
      
      // Normalize: Map 1.0-5.0 range to 0.0-1.0
      // Anything above 5.0 (5x distance vs displacement) is very high entropy
      mouseEntropy = Math.min((entropyRatio - 1) / 4, 1);
      if (mouseEntropy < 0) mouseEntropy = 0;
    }

    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'BEHAVIOR_UPDATE',
      payload: {
        scrollVelocity: averageScrollVelocity,
        isHoveringTop: isHoveringTop,
        avgTypingInterval: avgTypingInterval,
        backspaceCount: backspaceCount,
        mouseEntropy: mouseEntropy // New calculated metric
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Extension might be reloading, silently handle
        console.debug('Drift: Message send failed', chrome.runtime.lastError.message);
      } else {
        console.log('Drift: Behavior data sent', {
          scroll: averageScrollVelocity.toFixed(0),
          mouseEntropy: mouseEntropy.toFixed(2),
          typing: avgTypingInterval.toFixed(0)
        });
      }
    });
    
    // Reset counters for next interval
    scrollVelocities = [];
    typingIntervals = [];
    backspaceCount = 0;
    mousePath = [];
    mouseDistance = 0;
    
  }, UPDATE_INTERVAL);

  // ========== Intervention Overlay ==========
  
  // Activities list (Mirrors break.js)
  const interventionActivities = [
    '🚶‍♂️ Stand up and walk around',
    '🤸‍♀️ Do 5 jumping jacks',
    '👀 Look at something 20 feet away',
    '💪 Do 5 shoulder rolls',
    '🙆‍♂️ Stretch your arms up',
    '🧘‍♀️ Do 3 neck rolls',
    '🫁 Take 3 deep breaths'
  ];

  function showInterventionOverlay() {
    // Check if duplicate
    if (document.getElementById('drift-intervention-overlay')) return;

    // Create container
    const overlay = document.createElement('div');
    overlay.id = 'drift-intervention-overlay';
    
    // Shadow DOM for style isolation
    const shadow = overlay.attachShadow({ mode: 'closed' });
    
    // Pick random activity
    const activity = interventionActivities[Math.floor(Math.random() * interventionActivities.length)];
    
    // Styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
      }
      .drift-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(8px);
        z-index: 2147483647; /* Max Z-Index */
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: white;
        animation: fadeIn 0.3s ease-out;
      }
      .card {
        background: linear-gradient(135deg, #1e3a8a 0%, #581c87 100%);
        padding: 40px;
        border-radius: 24px;
        text-align: center;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.1);
        position: relative;
        overflow: hidden;
      }
      h1 {
        font-size: 32px;
        margin: 0 0 10px 0;
        font-weight: 800;
      }
      .subtitle {
        font-size: 16px;
        opacity: 0.8;
        margin-bottom: 30px;
      }
      .activity-box {
        background: rgba(255,255,255,0.1);
        padding: 20px;
        border-radius: 16px;
        margin-bottom: 30px;
        font-size: 20px;
        font-weight: 500;
        border: 1px solid rgba(255,255,255,0.2);
      }
      .timer {
        font-size: 64px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        margin-bottom: 20px;
        color: #60a5fa;
      }
      .btn {
        background: white;
        color: #1e3a8a;
        border: none;
        padding: 16px 32px;
        font-size: 18px;
        font-weight: 700;
        border-radius: 12px;
        cursor: pointer;
        transition: transform 0.2s;
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn:not(:disabled) {
        opacity: 1;
        cursor: pointer;
        background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
        color: white;
      }
      .btn:not(:disabled):hover {
        transform: scale(1.05);
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;

    // Content
    const wrapper = document.createElement('div');
    wrapper.className = 'drift-overlay';
    wrapper.innerHTML = `
      <div class="card">
        <h1>🧠 Brain Reset</h1>
        <div class="subtitle">Focus drifted. Let's reset.</div>
        
        <div class="activity-box">${activity}</div>
        
        <div class="timer">30</div>
        
        <button class="btn" disabled>Wait...</button>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(wrapper);
    document.body.appendChild(overlay);

    // Timer Logic
    let timeLeft = 30; // 30 seconds
    const timerEl = wrapper.querySelector('.timer');
    const btnEl = wrapper.querySelector('.btn');
    
    const interval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(interval);
        timerEl.textContent = "Done";
        timerEl.style.color = '#4ade80';
        
        btnEl.disabled = false;
        btnEl.textContent = "🔙 Go Back to Work";
        btnEl.onclick = () => {
          overlay.remove();
        };
      }
    }, 1000);
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TRIGGER_INTERVENTION') {
      console.log('Drift: Received intervention trigger');
      showInterventionOverlay();
    }
  });

  console.log('Drift: Content script initialized - Tracking scroll, mouse, and typing every 2 seconds');
})();
