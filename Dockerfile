# Use the official Node.js 20 image as a base.
FROM node:20-alpine AS builder

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

# Set environment variables for build time
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_IS_DEVELOPMENT=$NEXT_PUBLIC_CLERK_IS_DEVELOPMENT
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
