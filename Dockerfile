# Use the official Node.js 20 image as a base.
FROM node:20-alpine AS builder

# Set the working directory in the container.
WORKDIR /app

# Accept build arguments for Auth0 variables
ARG AUTH0_SECRET
ARG AUTH0_BASE_URL
ARG AUTH0_ISSUER_BASE_URL
ARG AUTH0_CLIENT_ID
ARG AUTH0_CLIENT_SECRET
ARG AUTH0_AUDIENCE
ARG AUTH0_SCOPE
ARG AUTH0_DEBUG
ARG NEXT_PUBLIC_SHOW_SOON_PAGE

# Set environment variables for build time
ENV AUTH0_SECRET=$AUTH0_SECRET
ENV AUTH0_BASE_URL=$AUTH0_BASE_URL
ENV AUTH0_ISSUER_BASE_URL=$AUTH0_ISSUER_BASE_URL
ENV AUTH0_CLIENT_ID=$AUTH0_CLIENT_ID
ENV AUTH0_CLIENT_SECRET=$AUTH0_CLIENT_SECRET
ENV AUTH0_AUDIENCE=$AUTH0_AUDIENCE
ENV AUTH0_SCOPE=$AUTH0_SCOPE
ENV AUTH0_DEBUG=$AUTH0_DEBUG
ENV NEXT_PUBLIC_SHOW_SOON_PAGE=$NEXT_PUBLIC_SHOW_SOON_PAGE

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy the source code
COPY . .

# Build the application with standalone output for better Cloud Run performance
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Set the working directory in the container.
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy the built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --chown=nextjs:nodejs next.config.ts ./

# Change to the nextjs user
USER nextjs

# Expose the port the app runs on.
EXPOSE 3000

# Set the environment variable for the port.
ENV PORT 3000
ENV NODE_ENV production

# Command to run the application.
CMD ["npm", "start"]
