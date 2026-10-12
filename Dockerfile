FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable
COPY . .
RUN yarn build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY mikro-orm.config.js ./
EXPOSE 3001
CMD ["node", "-r", "module-alias/register", "dist/main.js"]
