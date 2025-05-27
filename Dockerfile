# Use the official Node.js 20 image as a base.
FROM node:20-slim

# Set the working directory in the container.
WORKDIR /app

# Install pnpm globally.
RUN npm install -g pnpm

# Copy the standalone Next.js output.
# This includes node_modules, .next/standalone, .next/static, and public.
COPY ./mythoria-webapp/.next/standalone ./
COPY ./mythoria-webapp/.next/static ./.next/static
COPY ./mythoria-webapp/public ./public

# Expose the port the app runs on.
EXPOSE 3000

# Set the environment variable for the port.
ENV PORT 3000

# Command to run the application.
# The standalone output creates a server.js file.
CMD ["node", "server.js"]
