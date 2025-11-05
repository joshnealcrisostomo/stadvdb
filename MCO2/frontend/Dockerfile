# Use a lightweight Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Expose the default Vite port
EXPOSE 5173

# Command to run the Vite dev server
# The --host flag is CRUCIAL to expose it outside the container
CMD [ "npm", "run", "dev", "--", "--host" ]