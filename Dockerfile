# Generic Node.js / React / Next.js template.
# Uncomment "RUN npm run build" below if your project has a build step.
FROM node:20-slim

ARG SOURCE_COMMIT=unknown

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY . .

RUN npm run build

EXPOSE 3000
HEALTHCHECK CMD wget --no-verbose --tries=1 --spider http://localhost:$PORT/ || exit 1
CMD ["npm", "start"]
