FROM node:20-alpine
WORKDIR /app
COPY services/chat-service/package.json ./
RUN npm install --production
COPY services/chat-service/src ./src
COPY shared /app/shared
ENV NODE_PATH=/app
EXPOSE 4005
CMD ["node", "src/index.js"]
