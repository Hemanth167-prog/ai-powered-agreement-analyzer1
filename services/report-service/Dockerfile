FROM node:20-alpine
WORKDIR /app
COPY services/report-service/package.json ./
RUN npm install --production
COPY services/report-service/src ./src
COPY shared /app/shared
ENV NODE_PATH=/app
EXPOSE 4006
CMD ["node", "src/index.js"]
