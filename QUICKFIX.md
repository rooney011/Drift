# Quick Fix Guide - TensorFlow.js CSP Issues

## 🔴 Errors You're Seeing

1. **"Extension context invalidated"** ✅ NORMAL during development
2. **"unsafe-eval is not allowed"** ❌ CSP blocking TensorFlow.js
3. **"Cannot read properties of undefined (reading 'tfjs')"** ❌ tf not loading

---

## ✅ Quick Fix Steps

### Step 1: Close All Open Web Pages

- The "Extension context invalidated" errors are from old pages
- **Close all tabs** (or at least refresh them)

### Step 2: Reload Extension

1. Go to `chrome://extensions/`
2. Click **reload** (🔄) on Drift
3. **Wait 2 seconds** for offscreen to initialize

### Step 3: Open Service Worker Console

1. Click **"Service worker"** link
2. You should see:
   ```
   TensorFlow.js loaded, version: X.X.X
   Drift AI Offscreen: Ready to load model
   ```

### Step 4: Open a Fresh Test Page

1. Open a **NEW tab** (not an old one)
2. Go to any website
3. Scroll and type to generate data

---

## 🛠️ What I Fixed

**Added CSP meta tag to offscreen.html:**

```html
<meta
  http-equiv="Content-Security-Policy"
  content="script-src 'self' 'unsafe-eval'; worker-src 'self' blob:;"
/>
```

This explicitly allows:

- ✅ `unsafe-eval` - Required for TensorFlow.js
- ✅ `blob:` workers - Used by TensorFlow.js WebGL backend

---

## 🧪 Verify It Works

**In Service Worker console, you should see:**

```
Drift AI Offscreen: Initializing...
TensorFlow.js loaded, version: 4.X.X
Drift AI Offscreen: Ready to load model
```

**If you still see CSP errors:**

1. Make sure you saved offscreen.html
2. Reload the extension again
3. Check that tf.min.js exists in root folder

---

## ⚠️ Common Issues

### "Only a single offscreen document may be created"

- Extension tried to create offscreen twice
- **Solution**: Reload extension, it will clean up

### "Extension context invalidated" (repeated)

- Old content scripts still running on pages
- **Solution**: Refresh those pages or close them

### tf is undefined

- TensorFlow.js didn't load yet
- **Solution**: Wait mechanism should handle this now

---

## 🎯 Expected Final State

**Background console:**

```
✅ Drift: Model load initiated in offscreen document
✅ Drift AI: Model is ready in offscreen document
📊 Drift: Minute Stats: { ... modelReady: true }
```

**After 10 minutes:**

```
🧠 Drift AI: Running prediction with 10 data points
🧠 Drift AI Score: 0.XXXX
```

Try it now! 🚀
