FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb ./

RUN bun install

COPY . .

ENV NODE_ENV=production

RUN bun run build

CMD ["bun", "run", "src/server/index.ts"] 