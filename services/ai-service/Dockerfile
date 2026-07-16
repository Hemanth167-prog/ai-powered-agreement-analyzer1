FROM node:20-alpine
WORKDIR /app
COPY services/ai-service/package.json ./
RUN npm install --production
COPY services/ai-service/src ./src
COPY shared /app/shared
ENV NODE_PATH=/app
EXPOSE 4003
CMD ["node", "src/index.js"]
