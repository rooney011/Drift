# Drift Chrome Extension - Checkpoint 1

**Date**: January 5, 2026  
**Project**: Drift - Predictive Attention Monitoring Tool  
**Purpose**: Hackathon Submission

---

## 🎯 Project Overview

**Drift** is a privacy-first Chrome Extension designed to monitor user attention and detect distraction patterns through behavioral analysis. The extension uses predictive algorithms to track scroll patterns, mouse movements, and tab-switching behavior to provide real-time focus alerts.

### Core Principle

**Privacy-First**: No text logging, no URL tracking, no sensitive data collection - only behavioral patterns.

---

## 📁 Files Created

### 1. `manifest.json` - Manifest V3 Configuration

**Purpose**: Extension configuration and permissions

**Key Features**:

- ✅ Manifest V3 compliant (latest standard)
- ✅ Permissions: `storage`, `alarms`, `notifications`, `activeTab`, `scripting`
- ✅ Host permissions: `<all_urls>` for content script injection
- ✅ Service worker: `background.js`
- ✅ Content script: `content.js` (runs on all URLs)
- ✅ Popup interface: `popup.html`
- ✅ Icon configuration (16, 32, 48, 128px sizes)

---

### 2. `content.js` - Privacy-First Behavior Tracking

**Purpose**: Tracks user behavior patterns without logging sensitive data

**Features Implemented**:

#### Scroll Monitor

- Tracks `window.scrollY` position
- Calculates scroll velocity (pixels/millisecond)
- Detects erratic scrolling through direction change analysis
- Maintains history of last 10 scroll events
- Flags as erratic if >50% involve rapid direction changes

#### Mouse Monitor

- Tracks mouse Y-coordinate position
- Detects hovering near browser top (y < 50px)
- Indicates potential tab/URL bar checking behavior

#### Data Transmission

- Sends `BEHAVIOR_UPDATE` message every 30 seconds to background script
- Message includes:
  - `scrollVelocity`: Average scroll speed
  - `isScrollErratic`: Boolean flag for erratic behavior
  - `isHoveringTop`: Boolean flag for top-hover detection
  - `timestamp`: Data collection timestamp

#### Performance Optimizations

- Scroll event debouncing (100ms)
- Mouse tracking throttling (200ms)
- Passive event listeners for better performance
- Limited history storage (last 10 measurements)

---

### 3. `background.js` - Service Worker with Analysis Engine

**Purpose**: Analyze behavior data, calculate distraction scores, and trigger interventions

**Critical Implementation Details**:

- ✅ **Manifest V3 Compliant**: Uses `chrome.alarms` API instead of `setInterval`
- ✅ Alarm triggers every **1 minute** for periodic analysis

**Features Implemented**:

#### Message Handling

- Receives `BEHAVIOR_UPDATE` from content scripts
- Receives `DEMO_TRIGGER_NOTIFICATION` from popup (for demos)
- Stores latest behavior in `currentBehavior` variable

#### Tab Switch Tracking

- Monitors `chrome.tabs.onActivated` events
- Counts tab switches per analysis interval
- Resets counter after each analysis cycle

#### Distraction Score Algorithm

**Input Factors** (0.0 - 1.0 scale):

1. **Scroll Velocity** (0-0.4): High velocity = scanning/distracted
2. **Erratic Scrolling** (+0.3): Rapid direction changes
3. **Top Hovering** (+0.2): Mouse near tabs = tab checking
4. **Tab Switching** (0-0.3): >5 switches/min = high distraction

**Formula**:

```javascript
distractionScore = min(
  scrollVelocity * 0.4 +
    (isErratic ? 0.3 : 0) +
    (isHoveringTop ? 0.2 : 0) +
    min(tabSwitches / 15, 0.3),
  1.0
);
```

#### Focus History Storage

- Saves analysis data to `chrome.storage.local`
- Array: `focusHistory`
- Each entry contains:
  - `timestamp`: Analysis time
  - `distractionScore`: Calculated score (0-1)
  - `scrollVelocity`: Raw velocity data
  - `isScrollErratic`: Boolean flag
  - `isHoveringTop`: Boolean flag
  - `tabSwitchCount`: Number of switches
- Limited to 1000 entries to prevent storage bloat

#### Intervention System

- **Threshold**: `distractionScore > 0.7`
- **Action**: Chrome notification
- **Message**: "Focus drifting? Do 5 jumping jacks!"
- **Title**: "Drift"
- Displays distraction percentage in notification

---

### 4. `popup.html` - Modern UI Interface

**Purpose**: Visualize focus history and provide user insights

**Design**:

- Modern glassmorphic design with gradient background
- 420px width, responsive layout
- Purple gradient theme (#667eea to #764ba2)

**UI Components**:

#### Header

- Extension title "Drift"
- Subtitle: "Predictive Attention Monitoring"

#### Status Box

- Displays current focus score (0-100%)
- Color-coded status messages:
  - 🎯 **70-100%**: "Excellent focus!" (green)
  - ⚡ **50-69%**: "Moderate focus" (yellow)
  - ⚠️ **30-49%**: "Getting distracted" (orange)
  - 🚨 **0-29%**: "High distraction!" (red)

#### Stats Grid

- **Data Points**: Total history entries
- **Avg Score**: Average focus score across all data

#### Chart Container

- Chart.js canvas element
- White background with rounded corners
- Title: "Focus History"
- 200px height

#### Demo Button

- **Hidden by default**
- Reveal with **`Ctrl+Shift+D`** keyboard shortcut
- Button text: "🎯 Simulate Distraction (Demo)"
- Gradient styling (pink to red)

---

### 5. `popup.js` - Visualization & Demo Logic

**Purpose**: Fetch data, render charts, and provide demo functionality

**Features Implemented**:

#### Data Loading

- Fetches `focusHistory` from `chrome.storage.local` on popup load
- Auto-refreshes every 10 seconds
- Updates all UI components with latest data

#### Chart Rendering (Chart.js)

- **Chart Type**: Line chart
- **Data**: Last 20 data points (for readability)
- **X-axis**: Time (HH:MM format)
- **Y-axis**: Focus score (0-100%)
- **Styling**:
  - Purple gradient fill (#667eea to #764ba2)
  - 3px border width
  - Smooth tension curve (0.4)
  - Interactive tooltips
  - Point hover effects

#### Statistics Calculation

- Current focus score: `(1 - distractionScore) * 100`
- Average focus score: Mean of all historical scores
- Data point count: Total entries in history

#### Demo Mode (Hackathon Feature)

**Activation**: `Ctrl+Shift+D` keyboard shortcut

**Functionality**:

1. Reveals hidden demo button
2. When clicked:
   - Adds 5 synthetic distracted data points
   - Distraction scores: 0.75 - 0.95 (high)
   - Includes realistic metadata (velocity, erratic flags, tab counts)
   - Timestamps 1 second apart
3. Triggers immediate notification via background script
4. Updates chart in real-time
5. Visual feedback (button turns green, text changes)

---

## 🔄 Data Flow Architecture

```
┌─────────────────┐
│   Content.js    │ (On every webpage)
│  Behavior       │
│  Tracking       │
└────────┬────────┘
         │ Every 30s
         │ BEHAVIOR_UPDATE
         ▼
┌─────────────────┐
│  Background.js  │ (Service Worker)
│  - Receive data │
│  - Store state  │
└────────┬────────┘
         │ Every 1 min
         │ Alarm triggers
         ▼
┌─────────────────┐
│   Analysis      │
│  - Calculate    │
│    score        │
│  - Save history │
└────────┬────────┘
         │ If score > 0.7
         ▼
┌─────────────────┐
│  Notification   │
│  "Do 5 jumping  │
│   jacks!"       │
└─────────────────┘

┌─────────────────┐
│   Popup.html    │ (User opens popup)
│   & Popup.js    │
│  - Fetch data   │
│  - Render chart │
│  - Show stats   │
└─────────────────┘
```

---

## 🎨 Technical Highlights

### Manifest V3 Compliance ✅

- **No `setInterval` in service worker** - uses `chrome.alarms` API
- Service worker architecture (not persistent background page)
- Modern permission model

### Privacy-First Design ✅

- ❌ No text content logging
- ❌ No URL/domain tracking
- ❌ No keystroke capture
- ✅ Only behavioral metrics (scroll, mouse, tabs)
- ✅ All data stored locally (no external servers)

### Performance Optimizations ✅

- Event debouncing and throttling
- Passive event listeners
- Limited history storage
- Efficient data structures

### User Experience ✅

- Real-time visual feedback
- Color-coded status indicators
- Interactive charts with Chart.js
- Smooth animations and gradients
- Modern, professional UI design

---

## 🚀 Demo Features for Hackathon

### Quick Demo Walkthrough

1. **Install Extension**: Load unpacked in Chrome
2. **Browse Normally**: Let it collect some data (1-2 minutes)
3. **Open Popup**: View real-time focus score and chart
4. **Activate Demo Mode**: Press `Ctrl+Shift+D`
5. **Simulate Distraction**: Click demo button
6. **Show Notification**: Immediate alert appears
7. **Show Chart Update**: Real-time visualization of distraction spike

### Key Features to Highlight

- ✅ Privacy-first approach (no text logging)
- ✅ Manifest V3 compliance (future-proof)
- ✅ Real-time behavioral analysis
- ✅ Beautiful, modern UI with Chart.js
- ✅ Predictive intervention system
- ✅ Local-only data storage
- ✅ Lightweight performance impact

---

## 📋 Remaining Tasks

### Required Before Testing

1. **Create Icons**:
   - Generate or design icons (16x16, 32x32, 48x48, 128x128)
   - Save as PNG files in `icons/` folder
   - Files needed:
     - `icons/icon16.png`
     - `icons/icon32.png`
     - `icons/icon48.png`
     - `icons/icon128.png`

### Testing Checklist

- [ ] Load extension in Chrome (`chrome://extensions/`)
- [ ] Verify content script injection on web pages
- [ ] Test behavior tracking (scroll, mouse, tabs)
- [ ] Verify alarm triggers every 1 minute
- [ ] Test notification appearance (distraction > 0.7)
- [ ] Open popup and verify chart rendering
- [ ] Test demo mode activation (`Ctrl+Shift+D`)
- [ ] Verify demo simulation adds data and triggers notification
- [ ] Check chrome.storage.local for saved history

### Optional Enhancements

- [ ] Add settings page for customizable thresholds
- [ ] Implement daily/weekly focus reports
- [ ] Add export functionality (CSV/JSON)
- [ ] Create onboarding tutorial
- [ ] Add sound effects for notifications
- [ ] Implement focus streak tracking
- [ ] Add dark/light theme toggle

---

## 🛠️ Technologies Used

- **JavaScript ES6+** (Modern syntax, arrow functions, async/await)
- **Chrome Extension APIs**:
  - `chrome.storage` (local data persistence)
  - `chrome.alarms` (periodic task scheduling)
  - `chrome.notifications` (user alerts)
  - `chrome.runtime` (messaging between scripts)
  - `chrome.tabs` (tab activity monitoring)
- **Chart.js** (Data visualization library)
- **HTML5 & CSS3** (Modern UI with glassmorphism effects)
- **Manifest V3** (Latest Chrome extension standard)

---

## 📊 Expected Behavior

### Normal Browsing (Low Distraction)

- Slow, steady scrolling → Low velocity
- No erratic patterns → No direction changes
- Mouse in content area → No top hovering
- Minimal tab switching → Low tab count
- **Result**: `distractionScore` ≈ 0.1-0.3 → No notification

### Distracted Browsing (High Distraction)

- Rapid scrolling → High velocity
- Back-and-forth scrolling → Erratic patterns
- Mouse near tabs/URL → Top hovering
- Frequent tab switching → High tab count
- **Result**: `distractionScore` ≈ 0.7-0.9 → Notification triggered

---

## 🎯 Hackathon Pitch Points

1. **Problem**: Digital distraction is a growing issue affecting productivity and focus
2. **Solution**: Drift - predictive attention monitoring that detects distraction before it derails your workflow
3. **Innovation**: Privacy-first behavioral tracking (no invasive data collection)
4. **Technology**: Manifest V3 compliant, uses modern Chrome APIs
5. **UX**: Beautiful, data-driven interface with real-time insights
6. **Action**: Proactive interventions to reclaim focus
7. **Demo**: Live simulation showing instant distraction detection and notification

---

## 📝 Notes

- Extension name "Drift" references attention "drifting" away from tasks
- Jumping jacks suggestion is a science-backed method to reset focus (physical activity increases alertness)
- Chart.js was chosen for its lightweight size and ease of use
- 1-minute alarm interval balances responsiveness with performance
- 30-second behavior updates ensure fresh data without overwhelming the background script

---

**Checkpoint Status**: ✅ Core functionality complete, ready for icon creation and testing
