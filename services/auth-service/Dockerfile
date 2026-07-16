FROM node:20-alpine
WORKDIR /app
COPY services/auth-service/package.json ./
RUN npm install --production
COPY services/auth-service/src ./src
COPY shared /app/shared
ENV NODE_PATH=/app
EXPOSE 4001
CMD ["node", "src/index.js"]
