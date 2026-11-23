# Use the official Node.js 24.18.1 Alpine image (LTS)
ARG NODE_VERSION=24.18.1
FROM node:${NODE_VERSION}-alpine AS builder

ARG APP_GIT_SHA=unknown

# Set the working directory in the container.
WORKDIR /app

# Accept build arguments for NEXT_PUBLIC_ variables (needed for static generation)
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SUPPORTED_LOCALES
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL
ARG NEXT_PUBLIC_CLERK_IS_DEVELOPMENT
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GOOGLE_ADS_ID
ARG NEXT_PUBLIC_GOOGLE_TAG_ID
ARG NEXT_PUBLIC_OPENAI_PIXEL_ID
ARG NEXT_PUBLIC_OPENAI_PIXEL_DEBUG
ARG NEXT_PUBLIC_TTS_PROVIDER
ARG NEXT_PUBLIC_DEFAULT_CURRENCY
ARG NEXT_PUBLIC_APP_DOMAIN
ARG NEXT_PUBLIC_ASSETS_BASE_URL

# Set environment variables for build time
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_SUPPORTED_LOCALES=$NEXT_PUBLIC_SUPPORTED_LOCALES
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_IS_DEVELOPMENT=$NEXT_PUBLIC_CLERK_IS_DEVELOPMENT
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_GOOGLE_ADS_ID=$NEXT_PUBLIC_GOOGLE_ADS_ID
ENV NEXT_PUBLIC_GOOGLE_TAG_ID=$NEXT_PUBLIC_GOOGLE_TAG_ID
ENV NEXT_PUBLIC_OPENAI_PIXEL_ID=$NEXT_PUBLIC_OPENAI_PIXEL_ID
ENV NEXT_PUBLIC_OPENAI_PIXEL_DEBUG=$NEXT_PUBLIC_OPENAI_PIXEL_DEBUG
ENV NEXT_PUBLIC_TTS_PROVIDER=$NEXT_PUBLIC_TTS_PROVIDER
ENV NEXT_PUBLIC_DEFAULT_CURRENCY=$NEXT_PUBLIC_DEFAULT_CURRENCY
ENV NEXT_PUBLIC_APP_DOMAIN=$NEXT_PUBLIC_APP_DOMAIN
ENV NEXT_PUBLIC_ASSETS_BASE_URL=$NEXT_PUBLIC_ASSETS_BASE_URL
ENV APP_GIT_SHA=$APP_GIT_SHA

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Update npm and install dependencies
RUN npm install -g npm@latest && \
    npm ci --prefer-offline --no-audit

# Copy the source code
COPY . .

# The standalone production build must include the real offline service worker.
RUN npm run build && test -s public/sw.js

# Production stage - use same Node.js version as builder
FROM node:${NODE_VERSION}-alpine AS runner

ARG APP_GIT_SHA=unknown

# Set the working directory in the container.
WORKDIR /app

# Install security updates
RUN apk upgrade --no-cache

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Reuse the already patched dependencies from the builder image, then prune dev-only packages
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev && chown -R nextjs:nodejs /app

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
ENV APP_GIT_SHA=$APP_GIT_SHA

LABEL org.opencontainers.image.revision=$APP_GIT_SHA

# Command to run the application using standalone server
CMD ["node", "server.js"]
