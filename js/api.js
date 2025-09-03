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

  /**
   * Get high scores from the server
   * @returns {Promise<Array>} Array of high score objects
   */
  async getHighScores() {
    try {
      const response = await fetch(`${this.baseURL}/scores`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching high scores:', error);
      return [];
    }
  }

  /**
   * Save a player's score to the server
   * @param {string} playerName - The name of the player
   * @param {number} score - The player's score
   * @param {number} levelReached - The highest level reached
   * @returns {Promise<Object>} The saved score object
   */
  async saveScore(playerName, score, levelReached) {
    try {
      const response = await fetch(`${this.baseURL}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          player_name: playerName,
          score,
          level_reached: levelReached
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving score:', error);
      throw error;
    }
  }

  /**
   * Get stats for a specific player
   * @param {string} playerName - The name of the player
   * @returns {Promise<Object>} Player stats object
   */
  async getPlayerStats(playerName) {
    try {
      const response = await fetch(`${this.baseURL}/players/${encodeURIComponent(playerName)}`);
      
      if (response.status === 404) {
        return null; // Player not found
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return null;
    }
  }
}

// Export the API service
const gameAPI = new GameAPI();