FROM node:20-alpine
WORKDIR /app
COPY services/notification-service/package.json ./
RUN npm install --production
COPY services/notification-service/src ./src
COPY shared /app/shared
ENV NODE_PATH=/app
EXPOSE 4007
CMD ["node", "src/index.js"]
