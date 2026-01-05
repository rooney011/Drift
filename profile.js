// Profile Settings Page

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('profile-form');
    const fullNameInput = document.getElementById('full-name');
    const preferredNameInput = document.getElementById('preferred-name');
    const currentFocusSelect = document.getElementById('current-focus');
    const avatarCircle = document.getElementById('avatar-circle');
    const backBtn = document.getElementById('back-btn');
    const closeBtn = document.getElementById('close-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    // Load existing user data
    loadUserData();

    // Auto-fill preferred name from full name
    fullNameInput.addEventListener('input', () => {
        const fullName = fullNameInput.value.trim();
        const firstName = fullName.split(' ')[0];
        if (firstName && !preferredNameInput.dataset.manualEdit) {
            preferredNameInput.value = firstName;
            updateAvatar(fullName);
        }
    });

    // Mark preferred name as manually edited
    preferredNameInput.addEventListener('input', () => {
        preferredNameInput.dataset.manualEdit = 'true';
        updateAvatar(fullNameInput.value);
    });

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const fullName = fullNameInput.value.trim();
        const preferredName = preferredNameInput.value.trim();
        const currentFocus = currentFocusSelect.value;

        // Validation
        if (!fullName) {
            fullNameInput.focus();
            fullNameInput.style.borderColor = '#ef4444';
            setTimeout(() => {
                fullNameInput.style.borderColor = '';
            }, 2000);
            return;
        }

        if (!preferredName) {
            preferredNameInput.focus();
            preferredNameInput.style.borderColor = '#ef4444';
            setTimeout(() => {
                preferredNameInput.style.borderColor = '';
            }, 2000);
            return;
        }

        // Save to storage
        const userData = {
            userName: {
                full: fullName,
                preferred: preferredName
            },
            currentFocus: currentFocus
        };

        chrome.storage.local.set(userData, () => {
            console.log('Profile updated:', userData);

            // Show success feedback
            const btn = document.querySelector('.save-btn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Saved!
            `;
            btn.style.background = '#22c55e';

            // Go back after short delay
            setTimeout(() => {
                goBack();
            }, 1000);
        });
    });

    // Navigation handlers
    backBtn.addEventListener('click', goBack);
    closeBtn.addEventListener('click', goBack);
    cancelBtn.addEventListener('click', goBack);

    function loadUserData() {
        chrome.storage.local.get(['userName', 'currentFocus'], (result) => {
            if (result.userName) {
                fullNameInput.value = result.userName.full || '';
                preferredNameInput.value = result.userName.preferred || '';
                updateAvatar(result.userName.full);
            }

            if (result.currentFocus) {
                currentFocusSelect.value = result.currentFocus;
            }
        });
    }

    function updateAvatar(fullName) {
        if (!fullName) return;

        const nameParts = fullName.trim().split(' ');
        const initials = nameParts.length >= 2
            ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
            : fullName.substring(0, 2);

        avatarCircle.textContent = initials.toUpperCase();
    }

    function goBack() {
        // Check if we came from a specific page
        if (document.referrer && document.referrer.includes('chrome-extension://')) {
            window.history.back();
        } else {
            // Default to home page
            window.location.href = chrome.runtime.getURL('home.html');
        }
    }

    console.log('Profile settings page loaded');
});
