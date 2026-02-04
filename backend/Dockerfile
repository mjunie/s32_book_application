FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .


# Create log directory for Winston
RUN mkdir -p /var/log/books-api && chown node:node /var/log/books-api

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]