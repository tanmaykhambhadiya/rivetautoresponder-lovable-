FROM node:22-bullseye

WORKDIR /app

# Install dependencies (including dev deps needed for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Install a lightweight static server and expose port
RUN npm install -g serve
EXPOSE 3000

# Use the start script from package.json (`serve -s dist -l 3000`)
CMD ["npm", "start"]
