// Drift Popup Script - Analytics Integration

// Use global Analytics object (loaded via script tag)
const { getDailyAverage, getCurrentStatus, getLast7DaysData } = window.Analytics;

let focusChart = null;

// ========== Helper: Convert distractionScore to focus score ==========
function convertToFocusData(history) {
    return history.map(item => ({
        timestamp: item.timestamp,
        score: 1 - (item.distractionScore || 0) // Convert distraction to focus (0-1)
    }));
}

// ========== Load and Display Focus Data ==========
function loadFocusHistory() {
    chrome.storage.local.get(['focusHistory'], (result) => {
        const history = result.focusHistory || [];
        console.log(`Drift: Loaded ${history.length} data points`);

        // Convert to analytics format
        const focusData = convertToFocusData(history);

        // Update UI with analytics
        updateDailyAverage(focusData);
        updateCurrentStatus(focusData);
        updateStatsDisplay(history);
        renderWeeklyChart(focusData);
    });
}

// ========== Update Daily Average ==========
function updateDailyAverage(focusData) {
    const scoreElement = document.getElementById('focus-score');
    const statusElement = document.getElementById('focus-status');

    if (!scoreElement) return;

    const dailyAverage = getDailyAverage(focusData);

    if (dailyAverage === 0) {
        scoreElement.textContent = '--';
        if (statusElement) {
            statusElement.textContent = 'No data yet. Keep browsing!';
            statusElement.style.color = '#fff';
        }
    } else {
        scoreElement.textContent = dailyAverage + '%';
        if (statusElement) {
            statusElement.textContent = `Today's Focus: ${dailyAverage}%`;

            // Color based on score
            if (dailyAverage >= 70) {
                statusElement.style.color = '#4ade80';
            } else if (dailyAverage >= 50) {
                statusElement.style.color = '#fbbf24';
            } else {
                statusElement.style.color = '#f87171';
            }
        }
    }
}

// ========== Update Current Status ==========
function updateCurrentStatus(focusData) {
    const statusElement = document.getElementById('focus-status');

    if (!statusElement || focusData.length === 0) return;

    const status = getCurrentStatus(focusData);

    // Append status to existing text
    const currentText = statusElement.textContent;
    if (currentText && !currentText.includes('🟢') && !currentText.includes('🔴') && !currentText.includes('🟡')) {
        statusElement.textContent = `${currentText} - ${status}`;
    }
}

// ========== Update Stats Display ==========
function updateStatsDisplay(history) {
    const dataCountElement = document.getElementById('data-count');
    const avgScoreElement = document.getElementById('avg-score');

    if (!dataCountElement || !avgScoreElement) return;

    dataCountElement.textContent = history.length;

    if (history.length > 0) {
        // Calculate overall average focus score
        const avgDistraction = history.reduce((sum, entry) => sum + entry.distractionScore, 0) / history.length;
        const avgFocus = (1 - avgDistraction) * 100;
        avgScoreElement.textContent = avgFocus.toFixed(0) + '%';
    } else {
        avgScoreElement.textContent = '--';
    }
}

// ========== Render Weekly Chart with Chart.js ==========
function renderWeeklyChart(focusData) {
    const canvas = document.getElementById('focus-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (focusChart) {
        focusChart.destroy();
    }

    // Get 7-day data from analytics
    const weekData = getLast7DaysData(focusData);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
    gradient.addColorStop(1, 'rgba(118, 75, 162, 0.2)');

    // Chart configuration
    focusChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekData.labels.length > 0 ? weekData.labels : ['No data'],
            datasets: [{
                label: 'Focus Score (%)',
                data: weekData.data.length > 0 ? weekData.data : [0],
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
                        label: function (context) {
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
                        callback: function (value) {
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
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    console.log('Drift: Weekly chart rendered');
}

// ========== Simulate Distraction (Demo) ==========
function simulateDistraction() {
    console.log('Drift: Simulating distraction for demo');

    chrome.storage.local.get(['focusHistory'], (result) => {
        let history = result.focusHistory || [];

        // Add fake distracted data points
        const now = Date.now();
        const fakeData = [
            {
                timestamp: now - 60000,
                distractionScore: 0.1, // High focus
                scrollVelocity: 0.2,
                isScrollErratic: false,
                isHoveringTop: false,
                tabSwitchCount: 1
            },
            {
                timestamp: now - 40000,
                distractionScore: 0.2,
                scrollVelocity: 0.3,
                isScrollErratic: false,
                isHoveringTop: false,
                tabSwitchCount: 2
            },
            {
                timestamp: now - 20000,
                distractionScore: 0.6, // Getting distracted
                scrollVelocity: 1.5,
                isScrollErratic: true,
                isHoveringTop: true,
                tabSwitchCount: 6
            },
            {
                timestamp: now,
                distractionScore: 0.85, // Very distracted!
                scrollVelocity: 2.3,
                isScrollErratic: true,
                isHoveringTop: true,
                tabSwitchCount: 10
            }
        ];

        // Replace history with fake data for demo
        history = fakeData;

        // Save to storage
        chrome.storage.local.set({ focusHistory: history }, () => {
            console.log('Drift: Added simulated distraction data');

            // Reload and update display
            loadFocusHistory();

            // Send message to background script to create interactive notification
            chrome.runtime.sendMessage({ action: 'TRIGGER_DEMO_ALERT' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Drift: Failed to trigger demo alert', chrome.runtime.lastError);
                } else {
                    console.log('Drift: Demo alert triggered via background script', response);
                }
            });

            // Visual feedback on button
            const btn = document.getElementById('demo-btn');
            if (btn) {
                btn.textContent = '✅ Distraction Simulated!';
                btn.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';

                setTimeout(() => {
                    btn.textContent = '🎯 Simulate Distraction (Demo)';
                    btn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                }, 2000);
            }
        });
    });
}

// ========== Initialize on DOMContentLoaded ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('Drift popup loaded');

    // Load and display focus data
    loadFocusHistory();

    // Auto-refresh every 10 seconds
    setInterval(() => {
        console.log('Drift: Auto-refreshing display');
        loadFocusHistory();
    }, 10000);

    // Demo button setup
    const demoBtn = document.getElementById('demo-btn');
    if (demoBtn) {
        demoBtn.style.display = 'block';
        demoBtn.addEventListener('click', simulateDistraction);
    }

    // Keyboard shortcut: Ctrl+Shift+D for demo mode
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            if (demoBtn) {
                demoBtn.style.display = 'block';
                console.log('Drift: Demo mode activated via keyboard');
            }
        }
    });
});
