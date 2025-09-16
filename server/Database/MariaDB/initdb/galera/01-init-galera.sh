#!/bin/bash
# Script d'initialisation pour Galera Cluster
# À placer dans ./server/Database/MariaDB/initdb/galera/

set -euo pipefail

echo "[galera-init] Initialisation du cluster Galera..."

# Création des utilisateurs nécessaires
mysql -uroot -p"${MARIADB_ROOT_PASSWORD}" <<SQL
-- Utilisateur pour SST (State Snapshot Transfer)
CREATE USER IF NOT EXISTS 'sst_user'@'%' IDENTIFIED BY 'sst_password';
GRANT RELOAD, LOCK TABLES, PROCESS, REPLICATION CLIENT ON *.* TO 'sst_user'@'%';

-- Utilisateur de monitoring pour ProxySQL
CREATE USER IF NOT EXISTS 'monitor'@'%' IDENTIFIED BY 'monitor';
GRANT REPLICATION CLIENT, PROCESS ON *.* TO 'monitor'@'%';

-- Utilisateur de backup/replication si nécessaire
CREATE USER IF NOT EXISTS 'repl'@'%' IDENTIFIED BY 'replpass';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';

-- Utilisateur applicatif avec permissions étendues
GRANT ALL PRIVILEGES ON chat.* TO 'chat'@'%';

FLUSH PRIVILEGES;
SQL

echo "[galera-init] Utilisateurs créés avec succès."

# Vérification du statut Galera
mysql -uroot -p"${MARIADB_ROOT_PASSWORD}" -e "SHOW STATUS LIKE 'wsrep%';" || true

echo "[galera-init] Initialisation terminée."