// Home Page - Drift Extension

// Use global Analytics object
const { getDailyAverage } = window.Analytics;

// ========== Sidebar Toggle ==========
function setupSidebar() {
    const menuBtn = document.getElementById('menu-btn');
    const closeBtn = document.getElementById('close-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    menuBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
}

// ========== Load User Data ==========
function loadUserData() {
    chrome.storage.local.get(['userName'], (result) => {
        const userName = result.userName?.preferred || 'there';
        const fullName = result.userName?.full || 'Drift User';

        // Update greeting
        const greetingEl = document.getElementById('greeting');
        if (greetingEl) {
            greetingEl.textContent = `Hello ${userName}`;
        }

        // Update sidebar profile
        const nameEl = document.getElementById('user-name-mini');
        if (nameEl) {
            nameEl.textContent = fullName;
        }

        // Update sidebar avatar
        const avatarEl = document.getElementById('user-avatar-mini');
        if (avatarEl && result.userName) {
            const nameParts = fullName.split(' ');
            const initials = nameParts.length >= 2
                ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                : fullName.substring(0, 2);
            avatarEl.textContent = initials.toUpperCase();
        }
    });
}

// ========== Load Focus Data ==========
function loadFocusData() {
    chrome.storage.local.get(['focusHistory'], (result) => {
        const history = result.focusHistory || [];

        if (history.length === 0) {
            const percentageEl = document.getElementById('focus-percentage');
            if (percentageEl) {
                percentageEl.textContent = '0%';
            }
            return;
        }

        // Convert to focus data
        const focusData = history.map(item => ({
            timestamp: item.timestamp,
            score: 1 - (item.distractionScore || 0)
        }));

        // Get today's average
        const todayAverage = getDailyAverage(focusData);

        // Update display
        const percentageEl = document.getElementById('focus-percentage');
        if (percentageEl) {
            percentageEl.textContent = `${todayAverage}%`;

            // Add color based on score
            if (todayAverage >= 70) {
                percentageEl.style.color = '#22c55e'; // Green
            } else if (todayAverage >= 40) {
                percentageEl.style.color = '#5B5FED'; // Blue
            } else {
                percentageEl.style.color = '#ef4444'; // Red
            }
        }

        console.log('Focus data loaded:', { todayAverage });
    });
}

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('Home page loaded');

    setupSidebar();
    loadUserData();
    loadFocusData();

    // Make profile clickable
    const profileMini = document.querySelector('.user-profile-mini');
    if (profileMini) {
        profileMini.style.cursor = 'pointer';
        profileMini.addEventListener('click', () => {
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

    // Refresh focus data every 30 seconds
    setInterval(loadFocusData, 30000);
});
