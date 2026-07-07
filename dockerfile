FROM node:22-alpine

WORKDIR /usr/src/app

RUN npm install -g pnpm

COPY package*.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

RUN pnpm install

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

EXPOSE 3002