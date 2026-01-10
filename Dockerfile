# Use official Node LTS
FROM node:20-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies
RUN npm install

# Copy all source code and configs
COPY tsconfig.json ./
COPY src ./src
COPY database ./database
COPY scripts ./scripts

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create upload directories
RUN mkdir -p uploads/logos uploads/menu-items uploads/ads uploads/categories logs

# Expose port
EXPOSE 4021

# Start server
CMD ["node", "dist/server.js"]