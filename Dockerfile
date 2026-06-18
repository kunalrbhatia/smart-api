# Stage 1: Build
FROM node:24-slim AS builder

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy sources and configurations
COPY src/ ./src
COPY .babelrc tsconfig.json ./

# Build the project
RUN pnpm run build

# Remove devDependencies to optimize image size
RUN pnpm prune --prod

# Stage 2: Runtime
FROM node:24-slim

WORKDIR /app

# Copy production runtime files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create a volume for logs
VOLUME [ "/app/logs" ]

ENV PORT=3080
ENV NODE_ENV=production

EXPOSE 3080

CMD ["node", "dist/server.js"]
