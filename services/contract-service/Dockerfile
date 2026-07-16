FROM node:20-alpine
WORKDIR /app
COPY services/contract-service/package.json ./
RUN npm install --production
COPY services/contract-service/src ./src
COPY shared /app/shared
ENV NODE_PATH=/app
RUN mkdir -p /app/uploads
EXPOSE 4002
CMD ["node", "src/index.js"]
