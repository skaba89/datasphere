FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY next.config.ts tsconfig.json tailwind.config.ts postcss.config.js ./
RUN npm ci

COPY src/ ./src/
COPY public/ ./public/ 2>/dev/null || true

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public 2>/dev/null || true

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

CMD ["node", "server.js"]
