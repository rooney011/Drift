// Welcome Page - User Onboarding

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('welcome-form');
    const fullNameInput = document.getElementById('full-name');
    const preferredNameInput = document.getElementById('preferred-name');

    // Auto-fill preferred name from full name
    fullNameInput.addEventListener('input', () => {
        if (!preferredNameInput.value) {
            const fullName = fullNameInput.value.trim();
            const firstName = fullName.split(' ')[0];
            preferredNameInput.value = firstName;
        }
    });

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const fullName = fullNameInput.value.trim();
        const preferredName = preferredNameInput.value.trim();

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
        chrome.storage.local.set({
            userName: {
                full: fullName,
                preferred: preferredName
            },
            onboardingCompleted: true
        }, () => {
            console.log('User name saved:', { fullName, preferredName });

            // Show success feedback
            const btn = document.querySelector('.continue-btn');
            btn.textContent = '✓ Saved!';
            btn.style.background = '#22c55e';

            // Redirect to home after short delay
            setTimeout(() => {
                window.location.href = chrome.runtime.getURL('home.html');
            }, 800);
        });
    });

    console.log('Welcome page loaded');
});
