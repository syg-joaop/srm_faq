# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências (npm install funciona sem package-lock.json)
RUN npm install

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copiar dependências de produção
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copiar build e arquivos públicos
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Mudar ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]