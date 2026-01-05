// Drift Break Activity Script

// Array of break activities
const activities = {
  physical: [
    '🚶‍♂️ Stand up and walk around for 30 seconds',
    '🤸‍♀️ Do 5 jumping jacks',
    '👀 Look at something 20 feet away (20-20-20 rule)',
    '💪 Do 5 shoulder rolls',
    '🙆‍♂️ Stretch your arms above your head',
    '🧘‍♀️ Do 3 neck rolls (gently)',
    '🤲 Stretch your fingers and wrists'
  ],
  mental: [
    '🫁 Take 3 slow, deep breaths',
    '👂 Close your eyes and name 3 things you hear',
    '🧘‍♂️ Count backwards from 10 slowly',
    '💭 Think of 3 things you\'re grateful for',
    '👁️ Close your eyes and visualize a calm place',
    '🎯 Name 5 objects you can see around you'
  ]
};

// Get random activity
function getRandomActivity() {
  const categories = Object.keys(activities);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const categoryActivities = activities[randomCategory];
  return categoryActivities[Math.floor(Math.random() * categoryActivities.length)];
}

// Countdown timer
let timeLeft = 30;
const timerElement = document.getElementById('timer');
const activityElement = document.getElementById('activity');
const focusBtn = document.getElementById('focusBtn');

// Display random activity
activityElement.textContent = getRandomActivity();

// Start countdown
const countdown = setInterval(() => {
  timeLeft--;
  timerElement.textContent = timeLeft;
  
  if (timeLeft <= 0) {
    clearInterval(countdown);
    timerElement.textContent = '✓';
    timerElement.style.color = '#4ade80';
    
    // Enable the focus button
    focusBtn.disabled = false;
    focusBtn.textContent = '✨ I\'m Ready to Focus ✨';
  }
}, 1000);

// Focus button click handler
focusBtn.addEventListener('click', () => {
  // Close this tab
  window.close();
  
  // Fallback if window.close() doesn't work (some browsers block it)
  setTimeout(() => {
    if (!window.closed) {
      // Show a message instead
      document.body.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          flex-direction: column;
          text-align: center;
          padding: 40px;
        ">
          <h1 style="font-size: 48px; margin-bottom: 20px;">✨ Great Work!</h1>
          <p style="font-size: 24px; opacity: 0.9;">You can close this tab now.</p>
          <p style="font-size: 18px; opacity: 0.8; margin-top: 20px;">Press Ctrl+W (or Cmd+W on Mac)</p>
        </div>
      `;
    }
  }, 100);
});

// Prevent accidental closure during break
window.addEventListener('beforeunload', (e) => {
  if (timeLeft > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});

console.log('Drift Break: Activity loaded, timer started');
