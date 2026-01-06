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

// Get random activity (No Repeats)
async function getNewActivity() {
  const result = await chrome.storage.local.get(['lastActivity']);
  const lastActivity = result.lastActivity;
  
  // Flatten activities
  const allActivities = [
    ...activities.physical, 
    ...activities.mental
  ];
  
  // Filter out the last one
  const available = lastActivity 
    ? allActivities.filter(a => a !== lastActivity)
    : allActivities;
    
  const nextActivity = available[Math.floor(Math.random() * available.length)];
  
  // Save for next time
  chrome.storage.local.set({ lastActivity: nextActivity });
  
  return nextActivity;
}

// Countdown timer
let timeLeft = 30;
const timerElement = document.getElementById('timer');
const activityElement = document.getElementById('activity');
const focusBtn = document.getElementById('focusBtn');

// Display random activity
getNewActivity().then(activity => {
  activityElement.textContent = activity;
});

// Start countdown
const countdown = setInterval(() => {
  timeLeft--;
  timerElement.textContent = timeLeft;
  
  if (timeLeft <= 0) {
    clearInterval(countdown);
    timerElement.textContent = 'Done';
    timerElement.style.color = '#4ade80';
    
    // Enable the focus button
    focusBtn.disabled = false;
    focusBtn.textContent = '🔙 Go Back to Work';
    
    // Make the checkmark clickable too
    timerElement.style.cursor = 'pointer';
    timerElement.title = 'Click to close';
    timerElement.addEventListener('click', closeBreakTab);
  }
}, 1000);

// Function to close tab
function closeBreakTab() {
  window.close();
  
  // Fallback if window.close() doesn't work
  setTimeout(() => {
    if (!window.closed) {
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
}

// Focus button click handler
focusBtn.addEventListener('click', closeBreakTab);

// Prevent accidental closure during break
window.addEventListener('beforeunload', (e) => {
  if (timeLeft > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});

console.log('Drift Break: Activity loaded, timer started');
