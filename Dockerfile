# Use the official Node.js 22 image as a base.
FROM node:22.12-alpine AS builder

# Set the working directory in the container.
WORKDIR /app

# Accept build arguments for NEXT_PUBLIC_ variables (needed for static generation)
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_IS_DEVELOPMENT
ARG NEXT_PUBLIC_SHOW_SOON_PAGE
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID

# Set environment variables for build time
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_IS_DEVELOPMENT=$NEXT_PUBLIC_CLERK_IS_DEVELOPMENT
ENV NEXT_PUBLIC_SHOW_SOON_PAGE=$NEXT_PUBLIC_SHOW_SOON_PAGE
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Update npm and install dependencies
RUN npm install -g npm@latest && \
    npm ci --prefer-offline --no-audit

# Copy the source code
COPY . .

# Build the application with standalone output for better Cloud Run performance
RUN npm run build

# Production stage
FROM node:22.12-alpine AS runner

# Set the working directory in the container.
WORKDIR /app

# Install security updates
RUN apk upgrade --no-cache

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Update npm and install production dependencies
RUN npm install -g npm@latest && \
    npm ci --omit=dev --prefer-offline --no-audit && \
    npm cache clean --force

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy the built application from builder stage (standalone output)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Change to the nextjs user
USER nextjs

# Expose the port the app runs on.
EXPOSE 3000

# Set the environment variable for the port.
ENV PORT=3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

# Command to run the application using standalone server
CMD ["node", "server.js"]
