#!/bin/bash
set -e

echo "???? D??marrage du cluster Galera en s??quence..."

# Nettoyer tous les volumes
echo "???? Nettoyage des volumes..."
docker volume rm real-time-chat_galera_node1 real-time-chat_galera_node2 real-time-chat_galera_node3 2>/dev/null || true

# D??marrer galera1 (bootstrap)
echo "???? D??marrage de galera1 (bootstrap)..."
docker-compose up -d mariadb_galera1

# Attendre que galera1 soit healthy
echo "??? Attente de galera1..."
for i in {1..30}; do
    if docker-compose exec -T mariadb_galera1 mariadb -uroot -proot -e "SELECT 1;" >/dev/null 2>&1; then
        echo "??? galera1 est pr??t!"
        break
    fi
    echo "Attente... ($i/30)"
    sleep 2
done

# V??rifier que galera1 a bien bootstrapp??
echo "???? V??rification du cluster galera1..."
CLUSTER_SIZE=$(docker-compose exec -T mariadb_galera1 mariadb -uroot -proot -e "SHOW STATUS LIKE 'wsrep_cluster_size';" 2>/dev/null | tail -1 | awk '{print $2}')
if [ "$CLUSTER_SIZE" = "1" ]; then
    echo "??? galera1 a bien bootstrapp?? un cluster (taille: $CLUSTER_SIZE)"
else
    echo "??? Probl??me avec galera1 (taille du cluster: $CLUSTER_SIZE)"
    exit 1
fi

# D??marrer galera2
echo "???? D??marrage de galera2..."
docker-compose up -d mariadb_galera2

# Attendre galera2
echo "??? Attente de galera2..."
sleep 10

# V??rifier galera2
echo "???? V??rification de galera2..."
for i in {1..20}; do
    if docker-compose exec -T mariadb_galera2 mariadb -uroot -proot -e "SHOW STATUS LIKE 'wsrep_cluster_size';" 2>/dev/null | grep -q "3"; then
        echo "??? galera2 a rejoint le cluster!"
        break
    fi
    echo "Attente que galera2 rejoigne... ($i/20)"
    sleep 3
done

# D??marrer galera3
echo "???? D??marrage de galera3..."
docker-compose up -d mariadb_galera3

# Attendre galera3
echo "??? Attente de galera3..."
sleep 10

# V??rification finale
echo "???? V??RIFICATION FINALE DU CLUSTER:"
echo ""
echo "galera1:"
docker-compose exec -T mariadb_galera1 mariadb -uroot -proot -e "SHOW STATUS LIKE 'wsrep_cluster%';"
echo ""
echo "galera2:"
docker-compose exec -T mariadb_galera2 mariadb -uroot -proot -e "SHOW STATUS LIKE 'wsrep_cluster%';"
echo ""
echo "galera3:"
docker-compose exec -T mariadb_galera3 mariadb -uroot -proot -e "SHOW STATUS LIKE 'wsrep_cluster%';"

echo ""
echo "???? D??marrage termin??! V??rifie que wsrep_cluster_size = 3 partout."
