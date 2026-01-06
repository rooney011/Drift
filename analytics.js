// Analytics Page Script - Daily Insights

document.addEventListener('DOMContentLoaded', () => {
  initializeAnalytics();
});

async function initializeAnalytics() {
  console.log('Drift: Initializing insights dashboard...');
  
  // 1. Load Data
  const data = await chrome.storage.local.get(['focusHistory', 'focusMinutes', 'userName']);
  const history = data.focusHistory || [];
  const userName = data.userName || 'Friend';
  
  // 2. Personalize UI
  updateGreeting(userName);
  
  // 3. Update Metrics (Sweet Spot & Peak Time)
  updateSmartMetrics(history);
  
  // 4. Render Timeline Chart
  renderTimelineChart(history);
  
  // 5. Setup Filters
  setupFilters(history);
  
  // 6. Setup Settings Logic
  setupSettings();
  
  // 7. Setup Navigation
  setupViewNavigation();
  
  // 8. Listen for Real-time Updates
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.focusHistory || changes.focusMinutes)) {
      console.log('Drift: New data received, refreshing dashboard...');
      refreshDashboard();
    }
  });
}

async function refreshDashboard() {
  const data = await chrome.storage.local.get(['focusHistory', 'focusMinutes']);
  const history = data.focusHistory || [];
  
  // Re-run metrics and charts
  updateSmartMetrics(history);
  
  // Preserve current filter if possible, else default to 'today'
  const activeBtn = document.querySelector('.filter-btn.active');
  let range = 'today';
  if (activeBtn) {
      const text = activeBtn.innerText.toLowerCase();
      if (text.includes('yesterday')) range = 'yesterday';
      else if (text.includes('7 days')) range = 'week';
  }
  
  renderTimelineChart(history, range);
}

function setupViewNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const insightsView = document.getElementById('insights-view');
  const settingsView = document.getElementById('settings-view');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      const text = item.innerText.trim();
      
      // Update UI
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      
      // Toggle Views
      if (text.includes('Settings')) {
        insightsView.style.display = 'none';
        settingsView.style.display = 'block';
      } else {
        settingsView.style.display = 'none';
        insightsView.style.display = 'block';
      }
    });
  });
}

function setupSettings() {
  // 1. Load Sensitivity
  chrome.storage.local.get(['sensitivity', 'userName'], (data) => {
    const sensitivity = data.sensitivity || 'balanced';
    const radios = document.getElementsByName('sensitivity');
    
    radios.forEach(radio => {
      if (radio.value === sensitivity) radio.checked = true;
      
      // Add listener
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          chrome.storage.local.set({ sensitivity: e.target.value }, () => {
             console.log('Drift: Sensitivity saved:', e.target.value);
          });
        }
      });
    });
    
    // 2. Load Profile Name
    const nameInput = document.getElementById('settings-name');
    if (nameInput) nameInput.value = data.userName || '';
  });
  
  // 3. Save Profile
  const saveBtn = document.getElementById('save-profile-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = document.getElementById('settings-name').value;
      if (name.trim()) {
        chrome.storage.local.set({ userName: name }, () => {
          updateGreeting(name); // Live update
          saveBtn.innerText = 'Saved!';
          setTimeout(() => saveBtn.innerText = 'Save', 2000);
        });
      }
    });
  }
  
  // 4. Clear Data
  const clearBtn = document.getElementById('clear-data-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all focus history? This cannot be undone.')) {
        chrome.storage.local.set({ focusHistory: [], focusMinutes: 0 }, () => {
          alert('Data cleared successfully.');
          location.reload(); // Reload to refresh charts
        });
      }
    });
  }
}

function updateGreeting(name) {
  // Update Header Name
  const headerNameEl = document.getElementById('header-username');
  if (headerNameEl) headerNameEl.innerText = name;
  
  // Update Sidebar Name
  const sidebarNameEl = document.getElementById('sidebar-username');
  if (sidebarNameEl) sidebarNameEl.innerText = name;
  
  // Update Avatar
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) avatarEl.innerText = name.charAt(0).toUpperCase();
  
  // Greeting based on time
  const hour = new Date().getHours();
  // const greetingEl = document.getElementById('page-greeting'); // Not used directly
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
  else if (hour >= 17) timeGreeting = 'Good evening';
  
  const headerTextP = headerNameEl.parentElement;
  headerTextP.innerHTML = `${timeGreeting}, <span id="header-username" style="font-weight:600; color:#111;">${name}</span>. Focus is steady today.`;
}

// ========== Real Data Analysis Logic ==========

function updateSmartMetrics(history) {
  // 1. Sweet Spot Calculation
  // Definition: Average duration of continuous "High Focus" sessions (score > 0.6)
  const highFocusThreshold = 0.6;
  let durations = [];
  let currentStreakStart = null;
  let lastTimestamp = null;
  
  // Sort history by timestamp just in case
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
  
  sortedHistory.forEach(item => {
    const focusScore = 1 - (item.distractionScore || 0); // Convert distraction to focus
    
    if (focusScore >= highFocusThreshold) {
      // High focus point
      if (currentStreakStart === null) {
        currentStreakStart = item.timestamp;
      }
      lastTimestamp = item.timestamp;
    } else {
      // Streak broken
      if (currentStreakStart !== null && lastTimestamp !== null) {
        const durationMinutes = (lastTimestamp - currentStreakStart) / (1000 * 60);
        if (durationMinutes > 1) { // Only count streaks > 1 min
          durations.push(durationMinutes);
        }
        currentStreakStart = null;
        lastTimestamp = null;
      }
    }
  });
  
  // Handle ongoing streak at the end
  if (currentStreakStart !== null && lastTimestamp !== null) {
     const durationMinutes = (lastTimestamp - currentStreakStart) / (1000 * 60);
     if (durationMinutes > 1) durations.push(durationMinutes);
  }

  // Calculate Average
  let avgDuration = 0;
  if (durations.length > 0) {
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    avgDuration = Math.round(totalDuration / durations.length);
  }
  
  // Display Sweet Spot
  const sweetSpotEl = document.querySelector('.metric-card:nth-child(1) h2');
  if (sweetSpotEl) {
    const value = avgDuration > 0 ? avgDuration : '--';
    sweetSpotEl.innerHTML = `${value} <span style="font-size: 0.5em; opacity: 0.7; font-weight: 600;">mins</span>`;
  }

  // 2. Peak Productivity Calculation
  // Group by hour and find best 2-hour window
  const hourlyScores = {}; // { 10: [0.8, 0.9], 11: [0.5] }
  
  sortedHistory.forEach(item => {
    const date = new Date(item.timestamp);
    const hour = date.getHours();
    const score = 1 - (item.distractionScore || 0);
    
    if (!hourlyScores[hour]) hourlyScores[hour] = [];
    hourlyScores[hour].push(score);
  });
  
  // Calculate avg score per hour
  const hourlyAverages = {};
  for (let h = 0; h < 24; h++) {
    if (hourlyScores[h] && hourlyScores[h].length > 0) {
      const sum = hourlyScores[h].reduce((a, b) => a + b, 0);
      hourlyAverages[h] = sum / hourlyScores[h].length;
    } else {
      hourlyAverages[h] = 0;
    }
  }
  
  // Find best 2-hour window (sliding window)
  let bestWindowStart = 9; // Default 9 AM
  let maxWindowScore = -1;
  
  for (let h = 0; h < 23; h++) {
    const currentScore = hourlyAverages[h];
    const nextScore = hourlyAverages[h+1];
    
    // Only consider windows where we actually have data
    if (currentScore > 0 || nextScore > 0) {
       const windowAvg = (currentScore + nextScore) / 2;
       if (windowAvg > maxWindowScore) {
         maxWindowScore = windowAvg;
         bestWindowStart = h;
       }
    }
  }
  
  // Format Time (e.g., "10 AM - 12 PM")
  const formatHour = (h) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12} ${ampm}`;
  };
  
  const peakTimeText = maxWindowScore > 0 
    ? `${formatHour(bestWindowStart)} - ${formatHour(bestWindowStart + 2)}` 
    : '-- - --';

  const peakCardEl = document.querySelector('.metric-card:nth-child(2) h2');
  if (peakCardEl) {
    peakCardEl.innerText = peakTimeText;
  }
}

function setupFilters(history) {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all
      buttons.forEach(b => b.classList.remove('active'));
      // Add to clicked
      btn.classList.add('active');
      
      // Determine filter
      const text = btn.innerText.toLowerCase();
      let range = 'today';
      if (text.includes('yesterday')) range = 'yesterday';
      else if (text.includes('7 days')) range = 'week';
      
      renderTimelineChart(history, range);
    });
  });
}

function renderTimelineChart(history, range = 'today') {
  const ctx = document.getElementById('insights-chart').getContext('2d');
  
  // Destroy existing chart instance if it exists
  const existingChart = Chart.getChart("insights-chart");
  if (existingChart) existingChart.destroy();
  
  let filteredData = [];
  let labels = [];
  let dataValues = [];
  
  const now = new Date();
  
  if (range === 'today' || range === 'yesterday') {
    // Hourly View
    const targetDate = new Date();
    if (range === 'yesterday') targetDate.setDate(targetDate.getDate() - 1);
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Filter data for specific day
    filteredData = history.filter(item => 
      item.timestamp >= targetDate.getTime() && 
      item.timestamp < nextDay.getTime()
    );
    
    // Full 24-hour View
    const startHour = 0;
    const endHour = 23;
    
    for (let h = startHour; h <= endHour; h++) {
       const ampm = h >= 12 ? 'P' : 'A';
       const hour12 = h % 12 || 12;
       labels.push(`${hour12}${ampm}`);
       
       const hourItems = filteredData.filter(item => {
         return new Date(item.timestamp).getHours() === h;
       });
       
       if (hourItems.length > 0) {
         const sum = hourItems.reduce((acc, item) => acc + (1 - (item.distractionScore || 0)), 0);
         dataValues.push((sum / hourItems.length) * 100);
       } else {
         dataValues.push(0);
       }
    }
  } else if (range === 'week') {
    // Daily View (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    filteredData = history.filter(item => item.timestamp >= sevenDaysAgo.getTime());
    
    // Generate labels for last 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue
      labels.push(dayName);
      
      // Filter for this specific day
      const dayStart = d.getTime();
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      const dayEnd = nextDay.getTime();
      
      const dayItems = filteredData.filter(item => 
        item.timestamp >= dayStart && item.timestamp < dayEnd
      );
      
      if (dayItems.length > 0) {
         const sum = dayItems.reduce((acc, item) => acc + (1 - (item.distractionScore || 0)), 0);
         dataValues.push((sum / dayItems.length) * 100);
       } else {
         dataValues.push(0);
       }
    }
  }

  // Create Chart
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Avg Focus Level',
        data: dataValues,
        backgroundColor: (context) => {
          const value = context.raw;
          if (value === 0) return '#f3f4f6';
          return value > 50 ? '#3b82f6' : '#93c5fd'; 
        },
        borderRadius: 4,
        barThickness: 24
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { 
          enabled: true,
          callbacks: {
            label: (context) => `Avg Focus: ${context.parsed.y.toFixed(0)}%`
          }
        }
      },
      scales: {
        y: {
          display: false,
          beginAtZero: true,
          max: 100
        },
        x: {
          grid: { display: false },
          ticks: {
            color: '#9ca3af',
            font: { size: 11 }
          }
        }
      }
    }
  });
}
