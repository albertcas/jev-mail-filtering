FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx next build --webpack && node -e "require('fs').cpSync('.next/static','.next/standalone/.next/static',{recursive:true});require('fs').cpSync('messages','.next/standalone/messages',{recursive:true});require('fs').cpSync('fixtures/demo','.next/standalone/fixtures/demo',{recursive:true});for(const f of require('fs').readdirSync('.next/standalone'))if(f.startsWith('.env'))require('fs').rmSync('.next/standalone/'+f)"

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3737 HOSTNAME=0.0.0.0 JEV_DATA_DIR=/data JEV_SECRETS=env
COPY --from=build /app/.next/standalone ./
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 3737
USER node
CMD ["node", "server.js"]
