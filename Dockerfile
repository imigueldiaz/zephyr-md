FROM node:22-alpine3.20

# Build arguments
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Environment variables
ENV PORT=8585
ENV JWT_SECRET=
ENV ADMIN_USERNAME=admin
ENV ADMIN_PASSWORD_HASH=

# Crear un usuario no-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copiar solo package.json primero
COPY package.json ./

# Instalar dependencias y TypeScript globalmente
RUN yarn global add typescript && \
    yarn install --frozen-lockfile

# Copiar el resto de archivos
COPY . .

# Crear directorios necesarios
RUN mkdir -p /app/content /app/public /app/templates/default && \
    chown -R appuser:appgroup /app/content /app/public /app/templates/default

# Construir la aplicación
RUN yarn build

# Cambiar la propiedad de los archivos al usuario no-root
RUN chown -R appuser:appgroup /app

# Cambiar al usuario no-root
USER appuser

# Exponer el puerto que usa la aplicación
EXPOSE 8585

# Configurar volúmenes para contenido y archivos públicos
VOLUME ["/app/content", "/app/public"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8585/ || exit 1

CMD ["yarn", "start"]
