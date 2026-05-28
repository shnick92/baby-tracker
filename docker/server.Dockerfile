FROM node:20-alpine AS deps
WORKDIR /app

# Copy workspace manifests first — changes here invalidate the install layer
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/client/package.json ./packages/client/

# Copy prisma config + schema before npm ci so postinstall (prisma generate) succeeds
COPY packages/server/prisma.config.ts ./packages/server/
COPY packages/server/prisma ./packages/server/prisma

RUN npm ci

# ---- build: compile TypeScript to ESM JavaScript via esbuild ----
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json ./packages/server/
COPY packages/shared/src ./packages/shared/src

# Bundle server TypeScript to a single ESM file.
# --tsconfig resolves @tracker/shared via tsconfig paths → bundles it inline.
# @prisma/client is external because it loads a native query-engine binary at runtime.
RUN node_modules/.bin/esbuild packages/server/src/index.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --packages=external \
  --external:.prisma \
  --tsconfig=packages/server/tsconfig.json \
  --outfile=packages/server/dist/index.js

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
# Copy workspace-level node_modules for packages npm didn't hoist to root
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules

# Copy compiled server bundle
COPY --from=build /app/packages/server/dist/index.js ./packages/server/dist/index.js

# Runtime config files (no TypeScript source needed)
COPY packages/server/package.json ./packages/server/
COPY packages/server/prisma.config.ts ./packages/server/
COPY packages/server/prisma ./packages/server/prisma
COPY package.json ./

ENV PATH=/app/node_modules/.bin:$PATH

EXPOSE 3001
WORKDIR /app/packages/server
CMD ["node", "dist/index.js"]
