FROM node:22-alpine3.20

# Crear un usuario no-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copiar solo package.json primero
COPY package.json ./

# Instalar dependencias
RUN yarn install

# Copiar el resto de archivos
COPY . .

# Crear directorios necesarios
RUN mkdir -p /app/content /app/public /app/templates/default
RUN chown -R appuser:appgroup /app/content /app/public /app/templates/default

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

CMD ["yarn", "start"]
