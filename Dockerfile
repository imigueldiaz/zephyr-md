FROM node:22-alpine3.20

# Build arguments
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Environment variables (non-sensitive)
ENV PORT=8585
ENV ADMIN_USERNAME=admin
ENV COOKIE_DOMAIN=localhost
ENV JWT_EXPIRY=86400000

# Crear un usuario no-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copiar solo package.json y yarn.lock primero
COPY package.json yarn.lock ./

# Instalar dependencias y TypeScript globalmente
RUN yarn global add typescript && \
    yarn install --frozen-lockfile

# Copiar el resto de archivos
COPY . .

# Crear directorios necesarios y establecer permisos
RUN mkdir -p /app/content /app/public /app/templates/default && \
    chown -R appuser:appgroup /app

# Construir la aplicación
RUN yarn build

# Cambiar al usuario no-root
USER appuser

# Exponer el puerto que usa la aplicación
EXPOSE 8585

# Configurar volúmenes para contenido y archivos públicos
VOLUME ["/app/content", "/app/public"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8585/ || exit 1

# Las variables sensibles se pasan en tiempo de ejecución
ENV JWT_SECRET=
ENV ADMIN_PASSWORD_HASH=

CMD ["yarn", "start"]
