/**
 * prevent-zoom.js
 * Prevents unwanted zooming in web browsers caused by double-tap gestures
 * while maintaining all other touch interactions like scrolling and pinch-to-zoom.
 */

(function() {
  // Apply touch-action: manipulation to all elements
  // This disables double-tap to zoom while preserving pinch-to-zoom functionality
  document.addEventListener('DOMContentLoaded', function() {
    // Apply to all elements
    const style = document.createElement('style');
    style.textContent = '* { touch-action: manipulation; }';
    document.head.appendChild(style);
    
    // Prevent double-click default behavior as a fallback for browsers
    // that don't fully support touch-action: manipulation
    document.addEventListener('dblclick', function(e) {
      e.preventDefault();
    }, { passive: false });
  });
})();