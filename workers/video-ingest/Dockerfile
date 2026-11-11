FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --omit=dev=false
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]