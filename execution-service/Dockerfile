# Single-stage build for the execution service.
# Smaller and simpler than the server — only two deps, no Prisma, no DB.

FROM node:20-alpine

# Install the docker CLI so this service can spawn user-code containers
# via the bind-mounted /var/run/docker.sock (Docker-out-of-Docker).
# We never run a docker daemon inside this container.
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src
COPY index.js ./

# Stays as root. The host's docker socket is owned by root:docker, and
# mapping the host's docker group GID into the container is fragile
# (varies per host). Since this container already has effective control
# of the host docker daemon via the socket, dropping to a non-root user
# would not meaningfully improve isolation — see deployment-plan.md §6
# for the full security analysis.

# Not an HTTP server — only consumes BullMQ jobs from Redis.
CMD ["node", "index.js"]
