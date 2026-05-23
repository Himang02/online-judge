# Multi-stage build for the Express server.
# - builder: installs deps and generates the Prisma client
# - runtime: ships the built app, runs as non-root

# ---- builder ----
FROM node:20-alpine AS builder
# openssl CLI is required by Prisma to detect the OpenSSL version at
# runtime and pick the matching query engine binary. Without it,
# Prisma defaults to the openssl-1.1.x binary which fails on
# Alpine 3.19+ (libssl.so.1.1 no longer present).
RUN apk add --no-cache openssl
WORKDIR /app

# Install deps from the lockfile for a deterministic build.
# Both dev and prod deps are installed so the Prisma CLI is available
# to run `prisma generate` here and `prisma migrate deploy` at runtime.
COPY package.json package-lock.json ./
RUN npm ci

# Generate the Prisma client. Output path is set in schema.prisma to
# ../src/generated/prisma — created relative to the schema file.
COPY prisma ./prisma
RUN npx prisma generate

# Copy application source last so dep / schema changes don't invalidate
# this layer when only application code is edited.
COPY src ./src
COPY scripts ./scripts
COPY server.js ./

# ---- runtime ----
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

# Copy the entire built app (node_modules incl. Prisma CLI + generated
# client + source). Keeping the Prisma CLI in the runtime image lets us
# run `docker compose exec server npx prisma migrate deploy` against
# Neon during deployment without a separate migration container.
COPY --from=builder /app ./

# Drop root privileges before running the app.
USER node

EXPOSE 4000
CMD ["node", "server.js"]
