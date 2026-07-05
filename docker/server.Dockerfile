# Node 22+: @supabase/realtime-js needs the native global WebSocket.
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# --ignore-scripts skips the root "prepare": "husky" hook, which would fail
# here because husky is a devDependency; no production dep needs install scripts.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY src/server ./src/server

USER node
ENV PORT=5001
EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:5001/api/health || exit 1

CMD ["node", "src/server/server.js"]
