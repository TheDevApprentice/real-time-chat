# server/Database/MySql/Dockerfile
# Image MySQL pour l'environnement de développement.
# Le schéma applicatif est initialisé par le serveur Node, pas par cette image.

FROM mysql:8.0

# Variables d'environnement par défaut (override via docker-compose)
ENV MYSQL_DATABASE=chat \
    MYSQL_USER=chat \
    MYSQL_PASSWORD=chat \
    MYSQL_ROOT_PASSWORD=root \
    MYSQL_TCP_PORT=3306

# Port MySQL par défaut
EXPOSE 3306

# Volume de données persistant
VOLUME ["/var/lib/mysql"]

# Aucun script d'init copié ici : le serveur gère la création/migrations.
# L'entrypoint/cmd par défaut de l'image officielle lance mysqld.
