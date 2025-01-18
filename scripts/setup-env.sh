#!/bin/bash

# Script to setup environment variables from GitHub Secrets
# Usage: ./setup-env.sh <jwt_secret> <admin_password_hash> <admin_username>

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <jwt_secret> <admin_password_hash> [admin_username]"
    exit 1
fi

JWT_SECRET=$1
ADMIN_PASSWORD_HASH=$2
ADMIN_USERNAME=${3:-admin}

# Create .env file
cat > .env << EOL
# Generated from GitHub Secrets
JWT_SECRET=${JWT_SECRET}
ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}
ADMIN_USERNAME=${ADMIN_USERNAME}
NODE_ENV=production
PORT=8585
EOL

echo ".env file created successfully"
