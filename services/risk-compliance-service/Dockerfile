FROM node:20-alpine
WORKDIR /app
COPY services/risk-compliance-service/package.json ./
RUN npm install --production
COPY services/risk-compliance-service/src ./src
COPY shared /app/shared
ENV NODE_PATH=/app
EXPOSE 4004
CMD ["node", "src/index.js"]
