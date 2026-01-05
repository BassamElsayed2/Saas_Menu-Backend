# ----------------------------
# Base image
# ----------------------------
FROM node:20

# Set working directory
WORKDIR /app

# ----------------------------
# Install dependencies
# ----------------------------
# Copy only package files first for caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# ----------------------------
# Copy source code and tsconfig
# ----------------------------
COPY tsconfig.json ./
COPY src ./src

# ----------------------------
# Build the TypeScript project
# ----------------------------
RUN npm run build

# ----------------------------
# Expose port
# ----------------------------
EXPOSE 4021

# ----------------------------
# Start the app
# ----------------------------
CMD ["npm", "run", "start"]