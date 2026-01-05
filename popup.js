// Drift Popup Script - Visualization and Demo Controls

let focusChart = null;

// ========== Initialize on Load ==========
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get references to UI elements
    const ctx = document.getElementById('focus-chart').getContext('2d');
    const simulateBtn = document.getElementById('demo-btn'); // Matches the ID in popup.html
    const statusText = document.getElementById('focus-status');

    // 2. Load History from Storage
    const data = await chrome.storage.local.get("focusHistory");
    let history = data.focusHistory || [];

    // 3. Render the Chart (using Chart.js)
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.length > 0 ? history.map(item => new Date(item.timestamp).toLocaleTimeString()) : ['No data'],
            datasets: [{
                label: 'Focus Score',
                // Convert distractionScore to focus score (0-100%)
                data: history.length > 0 ? history.map(item => ((1 - (item.distractionScore || 0)) * 100).toFixed(1)) : [0],
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            scales: { 
                y: { 
                    beginAtZero: true, 
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                } 
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // --- DEMO MODE LOGIC (The part you were missing) ---
    // Make demo button visible (for hackathon demo)
    simulateBtn.style.display = 'block';
    
    // Also show on Ctrl+Shift+D keypress
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            simulateBtn.style.display = 'block';
            console.log('Drift: Demo mode activated via keyboard');
        }
    });
    
    simulateBtn.addEventListener('click', async () => {
        console.log("⚡ Demo Mode Activated");

        // A. Create fake "Distracted" data (matching background.js structure)
        const fakeData = [
            { 
                timestamp: Date.now() - 60000, 
                distractionScore: 0.1, // Low distraction = high focus
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
                distractionScore: 0.6, // Getting distracted
                scrollVelocity: 1.5,
                isScrollErratic: true,
                isHoveringTop: true,
                tabSwitchCount: 6
            },
            { 
                timestamp: Date.now(), 
                distractionScore: 0.85, // Very distracted!
                scrollVelocity: 2.3,
                isScrollErratic: true,
                isHoveringTop: true,
                tabSwitchCount: 10
            }
        ];

        // B. Save to storage (so the Backend thinks it's real)
        await chrome.storage.local.set({ focusHistory: fakeData });

        // C. Force the Notification to appear IMMEDIATELY
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Drift 🧠',
            message: 'Focus drifting? Do 5 jumping jacks! (Simulated)',
            priority: 2
        });

        // D. Update the Chart visuals to show the drop
        chart.data.labels = fakeData.map(d => new Date(d.timestamp).toLocaleTimeString());
        chart.data.datasets[0].data = fakeData.map(d => ((1 - d.distractionScore) * 100).toFixed(1));
        chart.data.datasets[0].borderColor = '#ff5252'; // Turn line red
        chart.data.datasets[0].backgroundColor = 'rgba(255, 82, 82, 0.1)';
        chart.update();

        // E. Update Status Text
        const focusScore = ((1 - 0.85) * 100).toFixed(0);
        statusText.innerText = `🚨 High distraction! (${focusScore}%)`;
        statusText.style.color = "red";
        
        // F. Visual feedback on button
        simulateBtn.textContent = '✅ Distraction Simulated!';
        simulateBtn.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
        
        setTimeout(() => {
            simulateBtn.textContent = '🎯 Simulate Distraction (Demo)';
            simulateBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        }, 2000);
    });
});
// ========== Load Focus History from Storage ==========
function loadFocusHistory() {
  chrome.storage.local.get(['focusHistory'], (result) => {
    const history = result.focusHistory || [];
    console.log(`Drift: Loaded ${history.length} data points`);
    
    // Update UI
    updateStatusDisplay(history);
    updateStatsDisplay(history);
    renderChart(history);
  });
}

// ========== Update Status Display ==========
function updateStatusDisplay(history) {
  const scoreElement = document.getElementById('focus-score');
  const statusElement = document.getElementById('focus-status');
  
  if (history.length === 0) {
    scoreElement.textContent = '--';
    statusElement.textContent = 'No data yet. Keep browsing!';
    return;
  }
  
  // Get latest score
  const latestData = history[history.length - 1];
  const score = latestData.distractionScore;
  const focusScore = (1 - score) * 100; // Invert: higher distraction = lower focus
  
  // Display focus score (0-100)
  scoreElement.textContent = focusScore.toFixed(0) + '%';
  
  // Status message based on score
  if (focusScore >= 70) {
    statusElement.textContent = '🎯 Excellent focus!';
    statusElement.style.color = '#4ade80';
  } else if (focusScore >= 50) {
    statusElement.textContent = '⚡ Moderate focus';
    statusElement.style.color = '#fbbf24';
  } else if (focusScore >= 30) {
    statusElement.textContent = '⚠️ Getting distracted';
    statusElement.style.color = '#fb923c';
  } else {
    statusElement.textContent = '🚨 High distraction!';
    statusElement.style.color = '#f87171';
  }
}

// ========== Update Stats Display ==========
function updateStatsDisplay(history) {
  const dataCountElement = document.getElementById('data-count');
  const avgScoreElement = document.getElementById('avg-score');
  
  dataCountElement.textContent = history.length;
  
  if (history.length > 0) {
    // Calculate average focus score
    const avgDistraction = history.reduce((sum, entry) => sum + entry.distractionScore, 0) / history.length;
    const avgFocus = (1 - avgDistraction) * 100;
    avgScoreElement.textContent = avgFocus.toFixed(0) + '%';
  } else {
    avgScoreElement.textContent = '--';
  }
}

// ========== Render Chart with Chart.js ==========
function renderChart(history) {
  const canvas = document.getElementById('focus-chart');
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart if it exists
  if (focusChart) {
    focusChart.destroy();
  }
  
  // Prepare data (show last 20 data points max)
  const displayData = history.slice(-20);
  
  const labels = displayData.map((entry, index) => {
    const date = new Date(entry.timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  });
  
  const focusScores = displayData.map(entry => {
    return ((1 - entry.distractionScore) * 100).toFixed(1);
  });
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
  gradient.addColorStop(1, 'rgba(118, 75, 162, 0.2)');
  
  // Chart configuration
  focusChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Focus Score (%)',
        data: focusScores,
        backgroundColor: gradient,
        borderColor: '#667eea',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#667eea',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 13
          },
          bodyFont: {
            size: 12
          },
          callbacks: {
            label: function(context) {
              return `Focus: ${context.parsed.y}%`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            },
            color: '#667eea',
            font: {
              size: 11
            }
          },
          grid: {
            color: 'rgba(102, 126, 234, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#667eea',
            font: {
              size: 10
            },
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
  
  console.log('Drift: Chart rendered with', displayData.length, 'data points');
}

// ========== Simulate Distraction (Demo Function) ==========
function simulateDistraction() {
  console.log('Drift: Simulating distraction for demo');
  
  chrome.storage.local.get(['focusHistory'], (result) => {
    let history = result.focusHistory || [];
    
    // Add 5 highly distracted data points
    const now = Date.now();
    const distractedPoints = [];
    
    for (let i = 0; i < 5; i++) {
      distractedPoints.push({
        timestamp: now + (i * 1000), // 1 second apart
        distractionScore: 0.75 + (Math.random() * 0.2), // 0.75 - 0.95
        scrollVelocity: 2.0 + Math.random(),
        isScrollErratic: true,
        isHoveringTop: true,
        tabSwitchCount: 8 + Math.floor(Math.random() * 5)
      });
    }
    
    // Add to history
    history.push(...distractedPoints);
    
    // Limit history size
    if (history.length > 1000) {
      history = history.slice(-1000);
    }
    
    // Save back to storage
    chrome.storage.local.set({ focusHistory: history }, () => {
      console.log('Drift: Added 5 distracted data points');
      
      // Reload display
      loadFocusHistory();
      
      // Trigger notification immediately
      chrome.runtime.sendMessage({
        type: 'DEMO_TRIGGER_NOTIFICATION'
      }, (response) => {
        console.log('Drift: Demo notification triggered');
      });
      
      // Show visual feedback
      const btn = document.getElementById('demo-btn');
      btn.textContent = '✅ Distraction Simulated!';
      btn.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
      
      setTimeout(() => {
        btn.textContent = '🎯 Simulate Distraction (Demo)';
        btn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      }, 2000);
    });
  });
}

// ========== Auto-refresh every 10 seconds ==========
setInterval(() => {
  console.log('Drift: Auto-refreshing display');
  loadFocusHistory();
}, 10000);
