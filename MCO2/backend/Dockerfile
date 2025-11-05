# Use a lightweight Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
# This caches our dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend code (server.js, etc.)
COPY . .

# Expose the port your server runs on (e.g., 3000)
EXPOSE 3000

# Command to run the app using nodemon
CMD [ "npm", "run", "start" ]