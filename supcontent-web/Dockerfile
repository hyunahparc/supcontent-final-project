# ============================================================
# Dockerfile — Client web Vite/React (supcontent-web)
# Build multi-étapes : build Vite → serveur Nginx
# ============================================================

# -- Étape 1 : build de l'application React
FROM node:22-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances en premier (cache Docker)
COPY package*.json ./

# Installer toutes les dépendances (dev inclus, nécessaires au build Vite)
RUN npm install

# Copier le reste du code source
COPY . .

# Variable d'environnement injectée au moment du build par docker-compose
# Vite expose uniquement les variables préfixées VITE_
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}

# Construire l'application pour la production
RUN npm run build

# -- Étape 2 : serveur Nginx léger pour servir les fichiers statiques
FROM nginx:alpine

# Copier le résultat du build Vite dans le dossier servi par Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier la configuration Nginx personnalisée (gestion du routing React SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port HTTP
EXPOSE 80

# Nginx démarre automatiquement
CMD ["nginx", "-g", "daemon off;"]
