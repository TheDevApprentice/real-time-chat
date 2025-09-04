# server/Database/Postgres/Dockerfile
# Image légère Postgres pour l'environnement de développement
# Le schéma est initialisé par le serveur Node, pas par cette image.

FROM postgres:16-alpine

# Variables d'environnement par défaut (pour le dev).
# Surchargables via docker-compose.yml
ENV POSTGRES_DB=chat \
    POSTGRES_USER=chat \
    POSTGRES_PASSWORD=chat \
    PGDATA=/var/lib/postgresql/data

# Expose le port Postgres par défaut
EXPOSE 5432

# Volume de données persistant
VOLUME ["/var/lib/postgresql/data"]

# Aucune copie d'init.sql ici: le serveur se charge d'initialiser le schéma.
# L'entrypoint/cmd par défaut de l'image officielle lance postgres.
