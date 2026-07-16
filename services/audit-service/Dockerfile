FROM node:20-alpine
WORKDIR /app
COPY services/audit-service/package.json ./
RUN npm install --production
COPY services/audit-service/src ./src
COPY shared /app/shared
ENV NODE_PATH=/app
EXPOSE 4008
CMD ["node", "src/index.js"]
