# ============================================================
# Multi-stage build: compile the React app, then run a small
# Express server that serves the build and the BigQuery API.
# ============================================================

FROM node:18-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY server ./server
COPY --from=build /app/build ./build
EXPOSE 8080
CMD ["node", "server/index.js"]
