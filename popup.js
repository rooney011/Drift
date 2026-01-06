// Drift Popup Script - Visualization and Demo Controls

let myChart = null;

// ========== Wait for DOM and Chart.js to be ready ==========
document.addEventListener('DOMContentLoaded', () => {
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded!');
    document.getElementById('focus-status').innerText = 'Error: Chart.js not loaded';
    return;
  }
  
  console.log('Drift: Popup initialized, Chart.js loaded');
  
  // Check onboarding status
  checkOnboarding();

  // Open Analytics / Settings Page
  const analyticsBtn = document.getElementById('open-analytics-btn');
  if (analyticsBtn) {
    analyticsBtn.addEventListener('click', () => {
      console.log('Drift: Opening analytics page...');
      chrome.tabs.create({ url: 'analytics.html' });
    });
  }
});

// ========== Onboarding Logic ==========
function checkOnboarding() {
  chrome.storage.local.get(['userName'], (result) => {
    const onboardingView = document.getElementById('onboarding-view');
    const dashboardView = document.getElementById('dashboard-view');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    
    if (result.userName) {
      // User is onboarded - show dashboard
      onboardingView.style.display = 'none';
      dashboardView.style.display = 'block';
      
      // Personalize header
      headerTitle.innerText = `Hi, ${result.userName}`;
      headerSubtitle.innerText = 'Run your day, don\'t let it run you.';
      
      initializePopup();
    } else {
      // New user - show onboarding
      onboardingView.style.display = 'block';
      dashboardView.style.display = 'none';
      
      // Setup save button
      document.getElementById('save-btn').addEventListener('click', () => {
        const fullName = document.getElementById('full-name').value;
        const preferredName = document.getElementById('preferred-name').value;
        
        if (preferredName.trim()) {
          chrome.storage.local.set({ 
            userName: preferredName,
            fullName: fullName 
          }, () => {
             // Switch to dashboard
             onboardingView.style.display = 'none';
             dashboardView.style.display = 'block';
             
             // Personalize header
             headerTitle.innerText = `Hi, ${preferredName}`;
             headerSubtitle.innerText = 'Run your day, don\'t let it run you.';
             
             initializePopup();
          });
        }
      });
    }
  });
}

// ========== Initialize Popup ==========
function initializePopup() {
  // Get UI elements
  const canvas = document.getElementById('focus-chart');
  const demoBtn = document.getElementById('demo-btn');
  const focusScoreEl = document.getElementById('focus-score');
  const focusStatusEl = document.getElementById('focus-status');
  const focusStreakEl = document.getElementById('focus-streak');
  const dataCountEl = document.getElementById('data-count');
  const avgScoreEl = document.getElementById('avg-score');
  
  if (!canvas) {
    console.warn('Canvas element not found - Chart will be disabled');
    // Don't return! Let other stats load.
  }
  
  // Make demo button visible
  demoBtn.style.display = 'block';
  
  // Load and display data
  loadAndDisplayData(canvas, focusScoreEl, focusStatusEl, focusStreakEl, dataCountEl, avgScoreEl);
  
  // Set up demo button
  demoBtn.addEventListener('click', () => {
    simulateDistraction(canvas, focusScoreEl, focusStatusEl, focusStreakEl, dataCountEl, avgScoreEl);
  });
  
  // Set up sensitivity selector
  const sensitivitySelect = document.getElementById('sensitivity');
  
  // Load saved sensitivity setting
  chrome.storage.local.get(['sensitivity'], (result) => {
    if (result.sensitivity) {
      sensitivitySelect.value = result.sensitivity;
      console.log('Drift: Loaded sensitivity setting:', result.sensitivity);
    }
  });
  
  // Save sensitivity when changed
  sensitivitySelect.addEventListener('change', () => {
    const sensitivity = sensitivitySelect.value;
    chrome.storage.local.set({ sensitivity: sensitivity }, () => {
      console.log('Drift: Sensitivity setting saved:', sensitivity);
    });
  });


  
  // Auto-refresh every 10 seconds (Backup)
  setInterval(() => {
    loadAndDisplayData(canvas, focusScoreEl, focusStatusEl, focusStreakEl, dataCountEl, avgScoreEl);
  }, 10000);

  // Listen for storage changes (Real-time update)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.focusHistory || changes.focusMinutes)) {
      console.log('Drift: Storage changed, updating popup UI...');
      loadAndDisplayData(canvas, focusScoreEl, focusStatusEl, focusStreakEl, dataCountEl, avgScoreEl);
    }
  });
}

// ========== Load and Display Data ==========
async function loadAndDisplayData(canvas, focusScoreEl, focusStatusEl, focusStreakEl, dataCountEl, avgScoreEl) {
  try {
    const result = await chrome.storage.local.get(['focusHistory', 'focusMinutes']);
    const history = result.focusHistory || [];
    const focusMinutes = result.focusMinutes || 0;
    
    console.log(`Drift: Loaded ${history.length} data points`);
    
    // Update stats
    updateStats(history, focusScoreEl, focusStatusEl, focusStreakEl, focusMinutes, dataCountEl, avgScoreEl);
    
    // Update circular progress with latest focus score
    const latestScore = focusScoreEl.textContent;
    updateCircularProgress(latestScore);
    
    // Update Line Chart (Missing call!)
    updateChart(canvas, history);
    
  } catch (error) {
    console.error('Error loading data:', error);
    focusStatusEl.innerText = 'Error loading data';
  }
}

// ========== Update Stats ==========
function updateStats(history, focusScoreEl, focusStatusEl, focusStreakEl, focusMinutes, dataCountEl, avgScoreEl) {
  dataCountEl.innerText = history.length;
  
  // Update focus streak display
  const streakHours = Math.floor(focusMinutes / 60);
  if (streakHours > 0) {
    focusStreakEl.innerText = `🔥 ${streakHours} Hour Streak!`;
    focusStreakEl.style.color = '#fbbf24'; // Gold color for streak
  } else if (focusMinutes > 0) {
    focusStreakEl.innerText = `🔥 ${focusMinutes} minutes...`;
    focusStreakEl.style.color = '#fff';
  } else {
    focusStreakEl.innerText = '🔥 Warming up...';
    focusStreakEl.style.color = '#fff';
    focusStreakEl.style.opacity = '0.6';
  }
  
  if (history.length === 0) {
    focusScoreEl.innerText = '--';
    focusStatusEl.innerText = 'No data yet. Keep browsing!';
    avgScoreEl.innerText = '--';
    return;
  }
  
  // Get latest score
  const latest = history[history.length - 1];
  const focusScore = ((1 - (latest.distractionScore || 0)) * 100).toFixed(0);
  focusScoreEl.innerText = focusScore + '%';
  
  // Status message
  if (focusScore >= 70) {
    focusStatusEl.innerText = '🎯 Excellent focus!';
    focusStatusEl.style.color = '#4ade80';
  } else if (focusScore >= 50) {
    focusStatusEl.innerText = '⚡ Moderate focus';
    focusStatusEl.style.color = '#fbbf24';
  } else if (focusScore >= 30) {
    focusStatusEl.innerText = '⚠️ Getting distracted';
    focusStatusEl.style.color = '#fb923c';
  } else {
    focusStatusEl.innerText = '🚨 High distraction!';
    focusStatusEl.style.color = '#f87171';
  }
  
  // Calculate average correctly
  // Fix: Calculate score for EACH item, ensuring it's a number
  const sum = history.reduce((acc, item) => {
    const itemScore = (1 - (item.distractionScore || 0)) * 100;
    return acc + itemScore;
  }, 0);
  
  const avg = history.length > 0 ? (sum / history.length).toFixed(0) : '--';
  avgScoreEl.innerText = avg === '--' ? '--' : avg + '%';
}

// ========== Update Circular Progress ==========
function updateCircularProgress(focusScore) {
  const circle = document.getElementById('progress-ring-circle');
  const percentageEl = document.getElementById('confidence-percentage');
  
  if (!circle || !percentageEl) return;
  
  // Clean string (remove % if present) to get number
  const cleanScore = focusScore.toString().replace('%', '');
  const percentage = cleanScore === '--' ? 0 : parseInt(cleanScore);
  
  // Update text (Ensure single %)
  percentageEl.textContent = cleanScore === '--' ? '--' : cleanScore + '%';
  
  // Calculate stroke-dashoffset for circular progress
  // Circumference = 2 * PI * radius = 2 * 3.14159 * 70 = 439.8
  const circumference = 439.8;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Animate the progress
  circle.style.strokeDashoffset = offset;
  
  // Change color based on score
  if (percentage >= 70) {
    circle.style.stroke = '#10b981'; // Green
  } else if (percentage >= 50) {
    circle.style.stroke = '#3b82f6'; // Blue
  } else if (percentage >= 30) {
    circle.style.stroke = '#f59e0b'; // Orange
  } else {
    circle.style.stroke = '#ef4444'; // Red
  }
}

// ========== Simulate Distraction (Demo) ==========
async function simulateDistraction(canvas, focusScoreEl, focusStatusEl, dataCountEl, avgScoreEl) {
  console.log('⚡ Demo Mode Activated');
  
  const demoBtn = document.getElementById('demo-btn');
  
  // Create realistic fake data
  const fakeData = [
    { 
      timestamp: Date.now() - 60000, 
      distractionScore: 0.1,
      scrollVelocity: 0.2,
      isScrollErratic: false,
      isHoveringTop: false,
      tabSwitchCount: 1
    },
    { 
      timestamp: Date.now() - 40000, 
      distractionScore: 0.2,
      scrollVelocity: 0.3,
      isScrollErratic: false,
      isHoveringTop: false,
      tabSwitchCount: 2
    },
    { 
      timestamp: Date.now() - 20000, 
      distractionScore: 0.6,
      scrollVelocity: 1.5,
      isScrollErratic: true,
      isHoveringTop: true,
      tabSwitchCount: 6
    },
    { 
      timestamp: Date.now(), 
      distractionScore: 0.85,
      scrollVelocity: 2.3,
      isScrollErratic: true,
      isHoveringTop: true,
      tabSwitchCount: 10
    }
  ];
  
  // Save to storage
  await chrome.storage.local.set({ focusHistory: fakeData });
  
  // Trigger notification
  // Trigger intervention overlay in active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
       chrome.tabs.sendMessage(tabs[0].id, {
         type: 'TRIGGER_INTERVENTION',
         score: 0.95 // Simulated high distraction
       }).catch(err => {
         console.log('Drift: Could not send to tab:', err);
         alert('Drift: Cannot show overlay on this page (Try a real website like Google or Wikipedia)');
       });
    }
  });
  
  // Update display
  updateStats(fakeData, focusScoreEl, focusStatusEl, dataCountEl, avgScoreEl);
  updateChart(canvas, fakeData);
  
  // Visual feedback
  demoBtn.textContent = '✅ Distraction Simulated!';
  demoBtn.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
  
  setTimeout(() => {
    demoBtn.textContent = '🎯 Simulate Distraction (Demo)';
    demoBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
  }, 2000);
}
// ========== Update Chart ==========
function updateChart(canvas, history) {
  if (!canvas) return; // Safety check
  const ctx = canvas.getContext('2d');
  
  if (!history || history.length === 0) return;
  
  // Prepare data (last 20 points max for readability)
  const recentHistory = history.slice(-20);
  const labels = recentHistory.map(item => new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const dataPoints = recentHistory.map(item => (1 - (item.distractionScore || 0)) * 100);
  
  // Destroy existing chart to prevent memory leaks/glitches
  if (myChart) {
    myChart.destroy();
  }
  
  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Focus Level',
        data: dataPoints,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#2563eb'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          intersect: false,
          callbacks: {
            label: (context) => `Focus: ${context.parsed.y.toFixed(0)}%`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { display: true, color: '#f3f4f6' },
          ticks: { font: { size: 10 }, color: '#9ca3af' }
        },
        x: {
          grid: { display: false },
          ticks: { display: false } // Hide x labels for cleanliness in small popup
        }
      }
    }
  });
}
