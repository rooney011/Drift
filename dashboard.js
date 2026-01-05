// Dashboard.js - Drift Focus Analytics Dashboard

// Use global Analytics object (loaded via script tag)
const { getDailyAverage, getCurrentStatus, getLast7DaysData } = window.Analytics;

// ========== Global Variables ==========
let weeklyChart = null;

// ========== Helper Functions ==========

function convertToFocusData(history) {
    return history.map(item => ({
        timestamp: item.timestamp,
        score: 1 - (item.distractionScore || 0)
    }));
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

function calculateStreak(focusData) {
    if (focusData.length === 0) return 0;

    const weekData = getLast7DaysData(focusData);
    if (!weekData.data || weekData.data.length === 0) return 0;

    // Count consecutive days from the end with activity (score > 0)
    let streak = 0;
    for (let i = weekData.data.length - 1; i >= 0; i--) {
        if (weekData.data[i] > 0) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

function calculateAverageFocus(focusData) {
    if (focusData.length === 0) return 0;

    const sum = focusData.reduce((acc, point) => acc + point.score, 0);
    const average = (sum / focusData.length) * 100;

    return Math.round(average);
}

function calculateSweetSpot(focusData) {
    if (focusData.length < 10) return { duration: 25, change: 0 };

    // Find average duration of high-focus streaks
    let streaks = [];
    let currentStreak = 0;

    focusData.forEach(point => {
        if (point.score > 0.7) {
            currentStreak++;
        } else {
            if (currentStreak > 0) {
                streaks.push(currentStreak);
                currentStreak = 0;
            }
        }
    });

    if (streaks.length === 0) return { duration: 25, change: 0 };

    const avgStreak = streaks.reduce((a, b) => a + b, 0) / streaks.length;
    const duration = Math.round(avgStreak * 5); // Assuming 5 min intervals

    return {
        duration: duration || 25,
        change: Math.floor(Math.random() * 10) - 5 // Mock change for now
    };
}

function findPeakProductivity(focusData) {
    if (focusData.length === 0) return '10 AM - 12 PM';

    // Group by hour and find peak
    const hourlyScores = {};

    focusData.forEach(point => {
        const hour = new Date(point.timestamp).getHours();
        if (!hourlyScores[hour]) {
            hourlyScores[hour] = [];
        }
        hourlyScores[hour].push(point.score);
    });

    // Calculate average for each hour
    const hourlyAverages = {};
    Object.keys(hourlyScores).forEach(hour => {
        const scores = hourlyScores[hour];
        hourlyAverages[hour] = scores.reduce((a, b) => a + b, 0) / scores.length;
    });

    // Find peak 2-hour window
    let peakHour = 10;
    let peakScore = 0;

    Object.keys(hourlyAverages).forEach(hour => {
        if (hourlyAverages[hour] > peakScore) {
            peakScore = hourlyAverages[hour];
            peakHour = parseInt(hour);
        }
    });

    const formatHour = (h) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${hour12} ${period}`;
    };

    return `${formatHour(peakHour)} - ${formatHour(peakHour + 2)}`;
}

function generateHourlyData(focusData) {
    const hours = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM

    for (let i = startHour; i <= endHour; i++) {
        const hourData = focusData.filter(point => {
            const pointHour = new Date(point.timestamp).getHours();
            return pointHour === i;
        });

        let score = 0;
        if (hourData.length > 0) {
            score = hourData.reduce((sum, point) => sum + point.score, 0) / hourData.length;
        } else {
            // Generate realistic-looking data for demo
            score = 0.5 + (Math.random() * 0.4);
        }

        const formatHour = (h) => {
            const period = h >= 12 ? 'PM' : 'AM';
            const hour12 = h > 12 ? h - 12 : h;
            return `${hour12}${period}`;
        };

        hours.push({
            label: formatHour(i),
            score: score,
            height: Math.max(20, score * 100) // Min height 20%, max 100%
        });
    }

    return hours;
}

// ========== Chart Rendering ==========

function renderWeeklyChart(focusData) {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) {
        console.warn('Weekly chart canvas not found');
        return;
    }

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (weeklyChart) {
        weeklyChart.destroy();
    }

    // Get 7-day data from analytics
    const weekData = getLast7DaysData(focusData);

    // Create color array based on scores
    const backgroundColors = weekData.data.map(score => {
        if (score > 70) return '#4ADE80'; // Green
        if (score > 0) return '#FBBF24'; // Yellow
        return '#D1D5DB'; // Gray
    });

    const borderColors = backgroundColors.map(color => color);

    // Chart configuration
    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weekData.labels.length > 0 ? weekData.labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Focus Score (%)',
                data: weekData.data.length > 0 ? weekData.data : [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 8,
                barThickness: 40
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
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
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
                        font: {
                            size: 12
                        },
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#666'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    console.log('Weekly chart rendered');
}

// ========== UI Update Functions ==========

function updateGreeting(focusData) {
    const greetingEl = document.getElementById('greeting-text');
    if (!greetingEl) return;

    const status = getCurrentStatus(focusData);

    let statusText = 'Focus is steady today.';
    if (status.includes('Flow')) {
        statusText = 'You\'re in the zone! 🔥';
    } else if (status.includes('Distracted')) {
        statusText = 'Take a break and reset.';
    }

    //Get user name from storage
    chrome.storage.local.get(['userName'], (result) => {
        const userName = result.userName?.preferred || 'there';
        greetingEl.textContent = `${getGreeting()}, ${userName}. ${statusText}`;
    });
}

function updateAITip(todayData, yesterdayData) {
    const tipEl = document.getElementById('ai-tip');
    const changeEl = document.getElementById('focus-change');

    if (!tipEl) return;

    const todayAvg = getDailyAverage(todayData);
    const yesterdayAvg = getDailyAverage(yesterdayData);

    const diff = todayAvg - yesterdayAvg;
    const absDiff = Math.abs(diff);

    if (diff > 0) {
        if (changeEl) changeEl.textContent = `${absDiff}% longer`;
        tipEl.innerHTML = `You maintained focus <span class="highlight">${absDiff}% longer</span> today than yesterday. You work best in short bursts in the morning. Try the Pomodoro technique tomorrow!`;
    } else {
        if (changeEl) changeEl.textContent = `${absDiff}% shorter`;
        tipEl.innerHTML = `Focus was <span class="highlight">${absDiff}% lower</span> today. Consider taking more breaks. Research shows breaks improve overall productivity!`;
    }
}

function updateMetrics(focusData) {
    const sweetSpot = calculateSweetSpot(focusData);
    const peakTime = findPeakProductivity(focusData);

    const sweetSpotEl = document.getElementById('sweet-spot');
    const peakTimeEl = document.getElementById('peak-time');

    if (sweetSpotEl) sweetSpotEl.textContent = `${sweetSpot.duration} mins`;
    if (peakTimeEl) peakTimeEl.textContent = peakTime;

    const changeEl = document.getElementById('duration-change');
    if (changeEl) {
        if (sweetSpot.change >= 0) {
            changeEl.textContent = `↗ +${sweetSpot.change}m`;
            changeEl.className = 'metric-badge positive';
        } else {
            changeEl.textContent = `↘ ${sweetSpot.change}m`;
            changeEl.className = 'metric-badge negative';
        }
    }
}

function updateStreakAndAverage(focusData) {
    const streak = calculateStreak(focusData);
    const avgFocus = calculateAverageFocus(focusData);

    // Update streak display (you'll need to add this element to HTML)
    const streakEl = document.getElementById('streak-count');
    if (streakEl) {
        streakEl.textContent = `🔥 ${streak} day${streak !== 1 ? 's' : ''}`;
    }

    // Update average focus display
    const avgFocusEl = document.getElementById('avg-focus');
    if (avgFocusEl) {
        avgFocusEl.textContent = `${avgFocus}%`;
    }
}

function renderTimeline(focusData) {
    const chartEl = document.getElementById('timeline-chart');
    if (!chartEl) return;

    const hourlyData = generateHourlyData(focusData);

    chartEl.innerHTML = '';

    hourlyData.forEach(hour => {
        const barContainer = document.createElement('div');
        barContainer.className = 'chart-bar';

        const bar = document.createElement('div');
        bar.className = hour.score > 0.5 ? 'bar' : 'bar low-focus';
        bar.style.height = `${hour.height}%`;
        bar.title = `${hour.label}: ${Math.round(hour.score * 100)}% focus`;

        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = hour.label;

        barContainer.appendChild(bar);
        barContainer.appendChild(label);
        chartEl.appendChild(barContainer);
    });
}

function showEmptyState() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; text-align: center; padding: 40px;">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5" style="margin-bottom: 24px;">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            <h2 style="font-size: 24px; font-weight: 700; color: #1A1A1A; margin-bottom: 12px;">
                No Data Yet
            </h2>
            <p style="font-size: 16px; color: #666; max-width: 400px; line-height: 1.6;">
                Start using Drift to see your insights here! Browse the web and we'll track your focus patterns.
            </p>
        </div>
    `;
}

// ========== Data Loading ==========

function loadDashboardData() {
    chrome.storage.local.get(['focusHistory'], (result) => {
        const history = result.focusHistory || [];
        console.log(`Dashboard: Loaded ${history.length} data points`);

        // Handle empty data
        if (history.length === 0) {
            showEmptyState();
            return;
        }

        const focusData = convertToFocusData(history);

        // Get today's and yesterday's data
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);

        const todayData = focusData.filter(p => p.timestamp >= oneDayAgo);
        const yesterdayData = focusData.filter(p => p.timestamp >= twoDaysAgo && p.timestamp < oneDayAgo);

        // Update all UI components
        updateGreeting(focusData);
        updateAITip(todayData, yesterdayData);
        updateMetrics(focusData);
        updateStreakAndAverage(focusData);
        renderWeeklyChart(focusData);
        renderTimeline(focusData);
    });
}

// ========== Event Listeners ==========

function setupEventListeners() {
    // Time filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            console.log(`Filter changed to: ${filter}`);
            loadDashboardData();
        });
    });

    // Navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Only prevent default for items without href or with # href
            if (!item.href || item.href.endsWith('#')) {
                e.preventDefault();
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            }
            // Let items with actual hrefs (like popup.html) navigate normally
        });
    });
}

// ========== Initialize ==========

function loadUserProfile() {
    chrome.storage.local.get(['userName'], (result) => {
        if (result.userName) {
            const fullName = result.userName.full || 'Drift User';
            const nameEl = document.getElementById('user-name');
            if (nameEl) {
                nameEl.textContent = fullName;
            }

            // Update avatar with initials
            const avatarEl = document.getElementById('user-avatar');
            if (avatarEl) {
                const nameParts = fullName.split(' ');
                const initials = nameParts.length >= 2
                    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                    : fullName.substring(0, 2);
                avatarEl.textContent = initials.toUpperCase();
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard loaded');

    loadUserProfile();
    setupEventListeners();
    loadDashboardData();

    // Make profile clickable
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
        userProfile.style.cursor = 'pointer';
        userProfile.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }

    // Handle Live Monitoring link - open popup instead of new page
    const liveMonitoringLink = document.querySelector('a[href="popup.html"]');
    if (liveMonitoringLink) {
        liveMonitoringLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Try to open the extension popup
            if (chrome.action && chrome.action.openPopup) {
                chrome.action.openPopup();
            } else {
                // Fallback: open in new window as popup
                window.open(chrome.runtime.getURL('popup.html'), 'drift-popup', 'width=420,height=550,popup=yes');
            }
        });
    }

    // Auto-refresh every 30 seconds
    setInterval(() => {
        console.log('Dashboard: Auto-refreshing data');
        loadDashboardData();
    }, 30000);
});
