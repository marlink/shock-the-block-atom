/**
 * API Service for ShockTheBlock Atom game
 * Handles communication with the server for database operations
 */

class GameAPI {
  constructor() {
    // Dynamically determine the API base URL based on the current environment
    this.baseURL = this.determineApiBaseUrl();
  }

  /**
   * Determines the appropriate API base URL based on the current environment
   * @returns {string} The API base URL
   */
  determineApiBaseUrl() {
    // Check if we're in a production environment (deployed site)
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    
    // Production environment - check if we have a dedicated API subdomain
    if (hostname.startsWith('api.')) {
      // We're on the API subdomain, use relative path
      return '/api';
    }
    
    // Production environment with separate API subdomain
    // Replace 'yourdomain.com' with your actual domain in production
    return `https://api.${hostname}/api`;
  }

  // API methods can be added here as needed for future features
}

// Export the API service
const gameAPI = new GameAPI();