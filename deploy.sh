#!/bin/bash

# ShockTheBlock Atom Deployment Script
# This script prepares and deploys the game to a web server

# Configuration
DEPLOY_DIR="./deploy"
SERVER_DIR="$DEPLOY_DIR/server"
CLIENT_DIR="$DEPLOY_DIR/public"

# Create deployment directories
echo "Creating deployment directories..."
mkdir -p "$SERVER_DIR"
mkdir -p "$CLIENT_DIR"

# Copy server files
echo "Copying server files..."
cp -r ./server/server.js "$SERVER_DIR/"
cp -r ./server/init.sql "$SERVER_DIR/"
cp -r ./server/init-db.js "$SERVER_DIR/"
cp -r ./server/package.json "$SERVER_DIR/"
cp -r ./server/.env.example "$SERVER_DIR/.env.example"

# Copy client files
echo "Copying client files..."
cp ./index.html "$CLIENT_DIR/index.html"
cp ./game.html "$CLIENT_DIR/"
cp ./game.js "$CLIENT_DIR/"
cp ./styles.css "$CLIENT_DIR/"
cp -r ./js "$CLIENT_DIR/"
cp -r ./site-landing-page/styles-v04.css "$CLIENT_DIR/"
cp -r ./site-landing-page/script.js "$CLIENT_DIR/"

# Copy web server configuration files
echo "Copying web server configuration files..."
cp ./deploy/.htaccess "$CLIENT_DIR/"
cp ./deploy/nginx.conf "$DEPLOY_DIR/"

# Create .env file template in server directory
echo "Creating .env template..."
cat > "$SERVER_DIR/.env" << EOL
# Database Configuration
DATABASE_URL=postgresql://username:password@hostname:port/database?sslmode=require

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
EOL

# Install server dependencies
echo "Installing server dependencies..."
cd "$SERVER_DIR"
npm install --production

# Create a README for deployment
echo "Creating deployment README..."
cat > "$DEPLOY_DIR/README.md" << EOL
# ShockTheBlock Atom Deployment

## Directory Structure

- \`public/\` - Static files to be served by your web server
- \`server/\` - Node.js server for the API

## Setup Instructions

### Server Setup

1. Navigate to the server directory: \`cd server\`
2. Configure the .env file with your database credentials
3. Install dependencies: \`npm install --production\`
4. Initialize the database: \`node init-db.js\`
5. Start the server: \`node server.js\`

### Web Server Setup

1. Configure your web server (Apache, Nginx, etc.) to serve the files in the \`public\` directory
2. Ensure the API server is accessible at the URL configured in the client

## Domain Configuration

Refer to the deployment-guide.md in the original project for detailed domain and DNS configuration instructions.
EOL

echo "Deployment package created in $DEPLOY_DIR"
echo "See $DEPLOY_DIR/README.md for deployment instructions"