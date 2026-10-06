# Build context: repository root (the API also needs ../database).
FROM node:22-alpine

WORKDIR /app/backend
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/src ./src
COPY backend/scripts ./scripts
COPY database /app/database

# Patient photos are written here (mounted as a volume in docker-compose).
RUN mkdir -p uploads && chown node:node uploads

USER node
EXPOSE 5000
CMD ["node", "scripts/docker-start.js"]
