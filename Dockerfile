# Use official Node LTS
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and lockfile first (for caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the source code and tsconfig
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript project
RUN npx tsc -p tsconfig.json

# Expose the port
EXPOSE 4021

# Start the app
CMD ["node", "dist/index.js"]