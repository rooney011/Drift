// Debug IO script to replace tf.min.js for testing
console.log('DEBUG_IO: Script started execution');

window.tf = {
  version: { tfjs: 'DEBUG_VERSION_1.0' },
  loadLayersModel: async function(path) {
    console.log('DEBUG_IO: Mock loadLayersModel called with', path);
    return {
      predict: function(tensor) {
        console.log('DEBUG_IO: Mock predict called');
        return {
          dataSync: function() { return [0.12345]; }, // Return mock score
          dispose: function() {}
        };
      }
    };
  }
};

console.log('DEBUG_IO: Mock TF object attached to window');
