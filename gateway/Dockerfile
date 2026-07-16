FROM node:20-alpine
WORKDIR /app
COPY gateway/package.json ./
RUN npm install --production
COPY gateway/src ./src
COPY shared /app/shared
ENV NODE_PATH=/app
EXPOSE 4000
CMD ["node", "src/index.js"]
