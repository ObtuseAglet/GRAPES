# Stage 1: Build dashboard
FROM node:22-alpine AS dashboard-build
WORKDIR /app/dashboard
COPY dashboard/package.json dashboard/package-lock.json* ./
RUN npm install
COPY dashboard/ .
RUN npm run build

# Stage 2: Build server
FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ .
RUN npx tsc

# Stage 3: Production
FROM node:22-alpine
WORKDIR /app

# Copy server dist and deps
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/

# Copy dashboard dist
COPY --from=dashboard-build /app/dashboard/dist ./dashboard/dist

WORKDIR /app/server

ENV PORT=3001
ENV DASHBOARD_DIR=/app/dashboard/dist
ENV DATABASE_PATH=/app/data/grapes.db

VOLUME ["/app/data"]
EXPOSE 3001

CMD ["node", "dist/index.js"]
