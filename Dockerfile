FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/maps ./maps
COPY --from=builder /app/server/node_modules ./node_modules
EXPOSE 2567
CMD ["node", "dist/index.js"]
