# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS webapp-deps
WORKDIR /app/webapp-service
COPY webapp-service/package.json webapp-service/package-lock.json ./
RUN npm ci

FROM webapp-deps AS webapp-builder
WORKDIR /app/webapp-service
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL="URL_TO_BACKEND_API"
ENV NEXT_PUBLIC_WEBAPP_NAME="Let's Words"
COPY webapp-service .
RUN npm run build

FROM node:20-bookworm-slim AS webapp-runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5173
ENV HOSTNAME=0.0.0.0
COPY --from=webapp-builder /app/webapp-service/.next/standalone ./
COPY --from=webapp-builder /app/webapp-service/.next/static ./.next/static
EXPOSE 5173
CMD ["node", "server.js"]
