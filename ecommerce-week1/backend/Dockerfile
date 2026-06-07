# ─── Stage 1: Base ────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only (layer cache)
COPY package*.json ./
RUN npm install --omit=dev

# ─── Stage 2: Runtime ─────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY . .

EXPOSE 4000

CMD ["node", "index.js"]
