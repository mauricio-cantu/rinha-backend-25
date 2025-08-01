# step 1 - build
FROM node:22-alpine3.22 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# step 2 - js only source code
FROM node:22-alpine3.22 AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
RUN npm install --production
CMD ["npm", "run", "start"]
