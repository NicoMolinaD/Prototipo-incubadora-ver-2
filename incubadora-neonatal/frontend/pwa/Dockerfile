# frontend/pwa/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# Copia manifiestos primero (mejor caché)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Intenta CI; si el lock está desincronizado, instala normal
RUN if [ -f package-lock.json ]; then npm ci || npm install; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
    else npm i; fi

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
