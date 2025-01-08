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

# Construir la aplicación
RUN yarn build

# Cambiar la propiedad de los archivos al usuario no-root
RUN chown -R appuser:appgroup /app

# Cambiar al usuario no-root
USER appuser

EXPOSE 3000

CMD ["yarn", "start"]
