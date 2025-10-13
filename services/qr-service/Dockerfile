FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install ts-node and typescript globally for development
RUN npm install -g ts-node typescript

# Copy source code
COPY . .

EXPOSE 3002

# Use development command
CMD ["npm", "run", "dev"]