FROM node:22-alpine3.20

WORKDIR /app

# Copiar solo package.json primero
COPY package.json ./

# Instalar dependencias
RUN yarn install

# Copiar el resto de archivos
COPY . .

# Construir la aplicación
RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]
