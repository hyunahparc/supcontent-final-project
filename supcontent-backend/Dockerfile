# ============================================================
# Dockerfile — Backend Node.js (supcontent-backend)
# ============================================================

# -- Étape 1 : image de base Node.js LTS légère
FROM node:22-alpine

# Répertoire de travail dans le conteneur
WORKDIR /app

# Copier uniquement les fichiers de dépendances en premier
# (optimisation du cache Docker : npm install ne se relance que si package.json change)
COPY package*.json ./

# Installer les dépendances de production uniquement
RUN npm install --omit=dev

# Copier le reste du code source
COPY . .

# Exposer le port du serveur Express (valeur par défaut : 3000)
EXPOSE 3000

# Commande de démarrage (pas de nodemon en prod)
CMD ["node", "server.js"]
