#!/usr/bin/env node

/**
 * Version Synchronization Verification Script
 * Ensures that version numbers are consistent across all files
 * and that folder names match version tags
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FILES_TO_CHECK = [
  { path: 'game-fixed.js', patterns: [
    { regex: /GAME_VERSION\s*=\s*'(v[0-9]+\.[0-9]+)'/, group: 1 },
    { regex: /Version:\s*(v[0-9]+\.[0-9]+)/, group: 1 }
  ]},
  { path: 'README.md', patterns: [
    { regex: /## Version:\s*(v[0-9]+\.[0-9]+)/, group: 1 }
  ]},
  { path: 'index.html', patterns: [
    { regex: /Version:\s*(v[0-9]+\.[0-9]+)/, group: 1 }
  ]},
  { path: 'styles.css', patterns: [
    { regex: /Version:\s*(v[0-9]+\.[0-9]+)/, group: 1 }
  ]}
];

// Get the latest git tag
function getLatestGitTag() {
  try {
    const tags = execSync('git tag -l "v*"').toString().trim().split('\n');
    if (tags.length === 0 || tags[0] === '') return null;
    
    // Sort tags by version number
    tags.sort((a, b) => {
      const aMatch = a.match(/v([0-9]+)\.([0-9]+)/);
      const bMatch = b.match(/v([0-9]+)\.([0-9]+)/);
      
      if (!aMatch || !bMatch) return 0;
      
      const aMajor = parseInt(aMatch[1], 10);
      const aMinor = parseInt(aMatch[2], 10);
      const bMajor = parseInt(bMatch[1], 10);
      const bMinor = parseInt(bMatch[2], 10);
      
      if (aMajor !== bMajor) return bMajor - aMajor;
      return bMinor - aMinor;
    });
    
    return tags[0]; // Return the latest tag
  } catch (error) {
    console.error('Error getting git tags:', error.message);
    return null;
  }
}

// Extract version from file using regex patterns
function extractVersionFromFile(filePath, patterns) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    for (const pattern of patterns) {
      const match = content.match(pattern.regex);
      if (match && match[pattern.group]) {
        return match[pattern.group];
      }
    }
    
    console.warn(`No version found in ${filePath}`);
    return null;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

// Check if version folder exists
function checkVersionFolder(version) {
  if (!version) return false;
  
  // Convert v0.1 to version01
  const folderName = `version${version.substring(1).replace('.', '')}`;
  return fs.existsSync(folderName);
}

// Main execution
function main() {
  console.log('Verifying version synchronization...');
  
  // Get the latest git tag
  const latestTag = getLatestGitTag();
  console.log(`Latest git tag: ${latestTag || 'None'}`);
  
  // Extract versions from files
  const versions = {};
  let allMatch = true;
  
  for (const file of FILES_TO_CHECK) {
    const version = extractVersionFromFile(file.path, file.patterns);
    versions[file.path] = version;
    
    if (latestTag && version && version !== latestTag) {
      console.error(`Version mismatch in ${file.path}: ${version} (expected ${latestTag})`);
      allMatch = false;
    }
  }
  
  // Check if all files have the same version
  const uniqueVersions = new Set(Object.values(versions).filter(v => v !== null));
  if (uniqueVersions.size > 1) {
    console.error('Version inconsistency detected across files:');
    for (const [file, version] of Object.entries(versions)) {
      console.error(`  ${file}: ${version || 'No version found'}`);
    }
    allMatch = false;
  }
  
  // Check if version folder exists
  if (latestTag) {
    const versionFolderExists = checkVersionFolder(latestTag);
    if (!versionFolderExists) {
      console.warn(`Warning: No folder found for version ${latestTag}`);
      // This is just a warning, not an error
    }
  }
  
  if (allMatch) {
    console.log('Version synchronization verified successfully!');
    process.exit(0);
  } else {
    console.error('Version synchronization verification failed!');
    process.exit(1);
  }
}

// Run the main function
main();