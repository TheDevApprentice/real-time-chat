#!/bin/bash
# Script d'initialisation pour Galera Cluster
# À placer dans ./server/Database/MariaDB/initdb/galera/

set -euo pipefail

echo "[galera-init] Initialisation du cluster Galera..."

# Utiliser mariadb (le client officiel de MariaDB) au lieu de mysql
MYSQL_CMD="mariadb"

# Création des utilisateurs nécessaires
$MYSQL_CMD -uroot -p"${MARIADB_ROOT_PASSWORD}" <<SQL
-- Utilisateur pour SST (State Snapshot Transfer)
CREATE USER IF NOT EXISTS 'sst_user'@'%' IDENTIFIED BY 'sst_password';
GRANT RELOAD, LOCK TABLES, PROCESS, REPLICATION CLIENT ON *.* TO 'sst_user'@'%';

-- Utilisateur de monitoring pour ProxySQL
CREATE USER IF NOT EXISTS 'monitor'@'%' IDENTIFIED BY 'monitor';
GRANT PROCESS, REPLICATION CLIENT, REPLICATION SLAVE, SLAVE MONITOR ON *.* TO 'monitor'@'%';

-- Utilisateur de backup/replication si nécessaire
CREATE USER IF NOT EXISTS 'repl'@'%' IDENTIFIED BY 'replpass';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'repl'@'%';

-- Compte MaxScale pour lecture des métadonnées d'authentification (MariaDBAuth)
CREATE USER IF NOT EXISTS 'maxscale'@'%' IDENTIFIED BY 'maxscale';
GRANT SELECT ON mysql.* TO 'maxscale'@'%';
GRANT SHOW DATABASES ON *.* TO 'maxscale'@'%';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'maxscale'@'%';

-- Utilisateur applicatif avec permissions étendues
GRANT ALL PRIVILEGES ON chat.* TO 'chat'@'%';

FLUSH PRIVILEGES;
SQL

echo "[galera-init] Utilisateurs créés avec succès."

# Vérification du statut Galera (optionnel car peut échouer)
$MYSQL_CMD -uroot -p"${MARIADB_ROOT_PASSWORD}" -e "SHOW STATUS LIKE 'wsrep%';" 2>/dev/null || echo "[galera-init] Impossible de vérifier le statut Galera pour le moment."

echo "[galera-init] Initialisation terminée."