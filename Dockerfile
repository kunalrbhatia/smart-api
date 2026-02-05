FROM node:20

# Use a specific directory name instead of ./
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Clean npm cache and install
RUN npm cache clean --force && npm install

# Copy everything else
COPY . .

# Build the TypeScript code
RUN npm run build

# Ensure Cloud Run port alignment
ENV PORT=8000
EXPOSE 8000

# Run the COMPILED code (avoids ts-node timeout)
CMD ["node", "dist/server.js"]