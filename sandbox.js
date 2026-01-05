// Drift AI Sandbox Script
// Runs in sandboxed iframe with relaxed CSP (unsafe-eval allowed)

console.log('[Sandbox] Initializing...');

let model = null;
let isModelReady = false;
let isModelLoading = false;

// Wait for TensorFlow.js to load
function waitForTensorFlow(retries = 100) {
  return new Promise((resolve, reject) => {
    const check = () => {
      if (typeof tf !== 'undefined' && tf.version) {
        console.log('[Sandbox] TensorFlow.js loaded. Version:', tf.version.tfjs);
        resolve();
      } else if (retries > 0) {
        retries--;
        setTimeout(check, 100);
      } else {
        reject(new Error('Timeout waiting for TensorFlow.js'));
      }
    };
    check();
  });
}

// Load the AI model
async function loadModel() {
  if (isModelLoading || isModelReady) return;
  
  try {
    isModelLoading = true;
    await waitForTensorFlow();
    
    console.log('[Sandbox] Loading model from models/model.json...');
    model = await tf.loadLayersModel('models/model.json');
    isModelReady = true;
    isModelLoading = false;
    
    console.log('[Sandbox] ✅ Model loaded successfully!');
    
    // Notify parent (offscreen document) that model is ready
    parent.postMessage({
      type: 'MODEL_READY',
      status: 'success',
      version: tf.version.tfjs
    }, '*');
    
  } catch (error) {
    isModelLoading = false;
    console.error('[Sandbox] ❌ Failed to load model:', error);
    
    parent.postMessage({
      type: 'MODEL_READY',
      status: 'error',
      error: error.message
    }, '*');
  }
}

// Run prediction
async function predict(inputData) {
  if (!isModelReady || !model) {
    return { error: 'Model not ready' };
  }
  
  try {
    // inputData is array of 10 timesteps, each with 5 features
    // Model expects shape [batch, timesteps, features] = [1, 10, 5]
    const tensor = tf.tensor3d([inputData], [1, 10, 5]);
    const prediction = model.predict(tensor);
    const score = prediction.dataSync()[0];
    
    tensor.dispose();
    prediction.dispose();
    
    console.log('[Sandbox] Prediction:', score.toFixed(4));
    return { score: score };
    
  } catch (error) {
    console.error('[Sandbox] Prediction error:', error);
    return { error: error.message };
  }
}

// Listen for messages from parent (offscreen document)
window.addEventListener('message', async (event) => {
  const message = event.data;
  console.log('[Sandbox] Received message:', message.type);
  
  if (message.type === 'LOAD_MODEL') {
    await loadModel();
  } 
  else if (message.type === 'PREDICT') {
    const result = await predict(message.data);
    parent.postMessage({
      type: 'PREDICTION_RESULT',
      requestId: message.requestId,
      ...result
    }, '*');
  }
  else if (message.type === 'CHECK_STATUS') {
    parent.postMessage({
      type: 'STATUS_RESULT',
      isReady: isModelReady,
      isLoading: isModelLoading
    }, '*');
  }
});

// Auto-load model on startup
loadModel();
console.log('[Sandbox] Ready and listening for messages');
