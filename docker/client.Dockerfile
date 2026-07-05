# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY src/client/package.json src/client/package-lock.json ./
RUN npm ci --ignore-scripts

COPY src/client/ ./

# Baked into the bundle at build time (Create React App). The anon key is
# public by design — never pass SUPABASE_SERVICE_ROLE_KEY here.
ARG REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY
ENV REACT_APP_SUPABASE_URL=$REACT_APP_SUPABASE_URL \
    REACT_APP_SUPABASE_ANON_KEY=$REACT_APP_SUPABASE_ANON_KEY \
    CI=true
RUN npm run build

# ---- serve stage ----
FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
