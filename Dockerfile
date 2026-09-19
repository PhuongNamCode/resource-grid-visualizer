# Copyright (C) 2026 NeuroRAN. All rights reserved.

# Build stage: generate the cell profile + compile the static site.
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Optionally bake a specific gNB config into the image at build time:
#   docker build --build-arg GNB_CONFIG=/app/config/gnb.yml -t rgv .
ARG GNB_CONFIG=/app/config/generated/gnb.yml
RUN if [ -f "$GNB_CONFIG" ]; then node scripts/gnb_to_profile.mjs --config "$GNB_CONFIG"; fi \
  && npm run build

# Runtime stage: serve the static build.
FROM nginx:alpine AS runtime
LABEL org.opencontainers.image.title="resource-grid-visualizer"
LABEL org.opencontainers.image.description="Config-driven 3GPP 5G NR resource-grid visualizer"
LABEL org.opencontainers.image.vendor="NeuroRAN"
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
