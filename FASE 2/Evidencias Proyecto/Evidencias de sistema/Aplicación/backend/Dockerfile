FROM node:22-bookworm-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
 
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node
 
EXPOSE 3000
 
CMD ["sh", "-c", "node database/migrar.js && node src/app.js"]
 