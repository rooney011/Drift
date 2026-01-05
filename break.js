import { activities } from './activities.js';

// Randomly select one activity
function getRandomActivity() {
    const randomIndex = Math.floor(Math.random() * activities.length);
    return activities[randomIndex];
}

// Format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Update the progress circle based on remaining time
function updateProgressCircle(current, total) {
    const percentage = Math.round((current / total) * 100);
    const circumference = 2 * Math.PI * 70; // radius is 70
    const offset = circumference - (percentage / 100) * circumference;

    const progressRing = document.getElementById('progress-ring');
    const focusPercentage = document.getElementById('focus-percentage');

    if (progressRing) {
        progressRing.style.strokeDashoffset = offset;
    }
    if (focusPercentage) {
        focusPercentage.textContent = `${percentage}%`;
    }
}

// Initialize the break activity
function initBreakActivity() {
    const activity = getRandomActivity();

    // Get DOM elements
    const statusTitle = document.getElementById('status-title');
    const statusDescription = document.getElementById('status-description');
    const predictionText = document.querySelector('.prediction-text');
    const focusLabel = document.getElementById('focus-label');
    const doneBtn = document.querySelector('#done-btn') || createDoneButton();

    // Set initial content
    if (statusTitle) {
        statusTitle.textContent = activity.text;
    }
    if (statusDescription) {
        statusDescription.textContent = `Take ${activity.duration} seconds for this ${activity.type.toLowerCase()} activity.`;
    }
    if (predictionText) {
        predictionText.textContent = activity.type.toUpperCase();
    }
    if (focusLabel) {
        focusLabel.textContent = 'TIME';
    }

    // Start countdown timer
    let remainingTime = activity.duration;
    const totalTime = activity.duration;

    // Initial progress update
    updateProgressCircle(remainingTime, totalTime);

    const timerInterval = setInterval(() => {
        remainingTime--;
        updateProgressCircle(remainingTime, totalTime);

        // Update description with countdown
        if (statusDescription && remainingTime > 0) {
            statusDescription.textContent = `${formatTime(remainingTime)} remaining`;
        }

        // Timer finished
        if (remainingTime <= 0) {
            clearInterval(timerInterval);

            if (statusTitle) {
                statusTitle.textContent = 'Great job!';
            }
            if (statusDescription) {
                statusDescription.textContent = 'You completed this activity. Ready to focus?';
            }
            if (doneBtn) {
                doneBtn.textContent = "Let's Go!";
                doneBtn.style.display = 'inline-block';
            }
            if (predictionText) {
                predictionText.textContent = 'COMPLETED';
            }
        }
    }, 1000);

    // Add event listener to done button
    if (doneBtn) {
        doneBtn.addEventListener('click', () => {
            window.close();
        });
    }
}

// Create done button if it doesn't exist
function createDoneButton() {
    const focusContent = document.querySelector('.focus-content');
    if (!focusContent) return null;

    const button = document.createElement('button');
    button.id = 'done-btn';
    button.className = 'done-btn';
    button.textContent = "I'm Ready to Focus";
    button.style.display = 'none'; // Hidden until timer completes

    // Add button styles
    button.style.cssText = `
        margin-top: 24px;
        padding: 14px 32px;
        background: #5B5FED;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: 'Inter', sans-serif;
    `;

    // Add hover effect
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 8px 16px rgba(91, 95, 237, 0.3)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = 'none';
    });

    focusContent.appendChild(button);
    return button;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initBreakActivity);
