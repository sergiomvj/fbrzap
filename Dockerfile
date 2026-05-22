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

# Expose build args as runtime environment variables
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG OPENCLAW_BASE_URL
ARG OPENCLAW_API_KEY
ARG OPENCLAW_TIMEOUT_MS
ARG OPENCLAW_RETRY_ATTEMPTS
ARG APP_ENV

ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV OPENCLAW_BASE_URL=$OPENCLAW_BASE_URL
ENV OPENCLAW_API_KEY=$OPENCLAW_API_KEY
ENV OPENCLAW_TIMEOUT_MS=$OPENCLAW_TIMEOUT_MS
ENV OPENCLAW_RETRY_ATTEMPTS=$OPENCLAW_RETRY_ATTEMPTS
ENV APP_ENV=$APP_ENV

# The Fastify API runs on port 3000 by default (Easypanel compatibility)
EXPOSE 3000

# Start the API using the newly created start script
CMD ["npm", "--workspace", "apps/api", "run", "start"]
