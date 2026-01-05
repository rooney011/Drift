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
  initializePopup();
});

// ========== Initialize Popup ==========
function initializePopup() {
  // Get UI elements
  const canvas = document.getElementById('focus-chart');
  const demoBtn = document.getElementById('demo-btn');
  const focusScoreEl = document.getElementById('focus-score');
  const focusStatusEl = document.getElementById('focus-status');
  const dataCountEl = document.getElementById('data-count');
  const avgScoreEl = document.getElementById('avg-score');
  
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  // Make demo button visible
  demoBtn.style.display = 'block';
  
  // Load and display data
  loadAndDisplayData(canvas, focusScoreEl, focusStatusEl, dataCountEl, avgScoreEl);
  
  // Set up demo button
  demoBtn.addEventListener('click', () => {
    simulateDistraction(canvas, focusScoreEl, focusStatusEl, dataCountEl, avgScoreEl);
  });
  
  // Auto-refresh every 10 seconds
  setInterval(() => {
    loadAndDisplayData(canvas, focusScoreEl, focusStatusEl, dataCountEl, avgScoreEl);
  }, 10000);
}

// ========== Load and Display Data ==========
async function loadAndDisplayData(canvas, focusScoreEl, focusStatusEl, dataCountEl, avgScoreEl) {
  try {
    const result = await chrome.storage.local.get('focusHistory');
    const history = result.focusHistory || [];
    
    console.log(`Drift: Loaded ${history.length} data points`);
    
    // Update stats
    updateStats(history, focusScoreEl, focusStatusEl, dataCountEl, avgScoreEl);
    
    // Update chart
    updateChart(canvas, history);
    
  } catch (error) {
    console.error('Error loading data:', error);
    focusStatusEl.innerText = 'Error loading data';
  }
}

// ========== Update Stats ==========
function updateStats(history, focusScoreEl, focusStatusEl, dataCountEl, avgScoreEl) {
  dataCountEl.innerText = history.length;
  
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
  
  // Average score
  const avgDistraction = history.reduce((sum, item) => sum + (item.distractionScore || 0), 0) / history.length;
  const avgFocus = ((1 - avgDistraction) * 100).toFixed(0);
  avgScoreEl.innerText = avgFocus + '%';
}

// ========== Update Chart ==========
function updateChart(canvas, history) {
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart if it exists
  if (myChart) {
    myChart.destroy();
    myChart = null;
  }
  
  // Prepare data (last 20 points)
  const displayData = history.slice(-20);
  const labels = displayData.length > 0 
    ? displayData.map(item => new Date(item.timestamp).toLocaleTimeString())
    : ['No data'];
  const scores = displayData.length > 0
    ? displayData.map(item => ((1 - (item.distractionScore || 0)) * 100).toFixed(1))
    : [0];
  
  // Create new chart
  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Focus Score (%)',
        data: scores,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#667eea',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          callbacks: {
            label: (context) => `Focus: ${context.parsed.y}%`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => value + '%',
            color: '#667eea',
            font: { size: 11 }
          },
          grid: { color: 'rgba(102, 126, 234, 0.1)' }
        },
        x: {
          ticks: {
            color: '#667eea',
            font: { size: 10 },
            maxRotation: 45,
            minRotation: 45
          },
          grid: { display: false }
        }
      }
    }
  });
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
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Drift 🧠',
    message: 'Focus drifting? Do 5 jumping jacks! (Simulated)',
    priority: 2
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
