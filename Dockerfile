FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package.json and workspace configuration
COPY package*.json ./

# Copy the apps folder
COPY apps/api/package.json ./apps/api/
COPY apps/mobile/package.json ./apps/mobile/

# Install dependencies for all workspaces
RUN npm install

# Copy all source files
COPY . .

# Set environment variables for production
ENV NODE_ENV=production

# The Fastify API runs on port 3000 by default (Easypanel compatibility)
EXPOSE 3000

# Start the API using the newly created start script
CMD ["npm", "--workspace", "apps/api", "run", "start"]
