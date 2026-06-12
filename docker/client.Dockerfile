FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/client/package.json ./packages/client/
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# --ignore-scripts skips prisma generate; not needed for the client build
RUN npm ci --ignore-scripts

COPY packages/client ./packages/client
COPY packages/shared ./packages/shared

# VITE_* vars are baked into the JS bundle at build time
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_VAPID_PUBLIC_KEY
ARG VITE_FAMILY_SURNAME
ARG VITE_APP_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY
ENV VITE_FAMILY_SURNAME=$VITE_FAMILY_SURNAME
ENV VITE_APP_URL=$VITE_APP_URL

RUN npm run build -w packages/client

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
