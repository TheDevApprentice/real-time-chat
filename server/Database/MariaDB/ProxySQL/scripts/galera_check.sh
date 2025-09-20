#!/bin/bash
# Script de vérification de santé Galera pour ProxySQL
# À placer dans ./server/Database/ProxySQL/scripts/galera_check.sh

set -euo pipefail

MYSQL_USER="${MYSQL_USER:-monitor}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-monitor}"

# Configuration ProxySQL
PROXYSQL_HOST="${PROXYSQL_HOST:-127.0.0.1}"
PROXYSQL_PORT="${PROXYSQL_PORT:-6032}"
PROXYSQL_USER="${PROXYSQL_USER:-admin}"
PROXYSQL_PASS="${PROXYSQL_PASS:-admin}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >&2
}

check_galera_node() {
    local host=$1
    local port=${2:-3306}
    
    # Variables Galera critiques à vérifier
    local wsrep_ready
    local wsrep_connected
    local wsrep_local_state
    local wsrep_cluster_size
    
    # Exécuter les requêtes de vérification
    local status_output
    status_output=$(mysql -h"$host" -P"$port" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
        -e "SHOW STATUS WHERE Variable_name IN (
            'wsrep_ready', 
            'wsrep_connected', 
            'wsrep_local_state', 
            'wsrep_cluster_size',
            'wsrep_local_state_comment'
        );" --batch --skip-column-names 2>/dev/null) || return 1
    
    # Parser les résultats
    while IFS=$'\t' read -r variable value; do
        case $variable in
            wsrep_ready) wsrep_ready=$value ;;
            wsrep_connected) wsrep_connected=$value ;;
            wsrep_local_state) wsrep_local_state=$value ;;
            wsrep_cluster_size) wsrep_cluster_size=$value ;;
        esac
    done <<< "$status_output"
    
    # Vérifications de santé
    if [[ "$wsrep_ready" != "ON" ]]; then
        log "WARN: Node $host not ready (wsrep_ready=$wsrep_ready)"
        return 1
    fi
    
    if [[ "$wsrep_connected" != "ON" ]]; then
        log "WARN: Node $host not connected (wsrep_connected=$wsrep_connected)"
        return 1
    fi
    
    # wsrep_local_state: 4 = Synced
    if [[ "$wsrep_local_state" != "4" ]]; then
        log "WARN: Node $host not synced (wsrep_local_state=$wsrep_local_state)"
        return 1
    fi
    
    # Vérifier la taille du cluster (au moins 2 nœuds)
    if [[ "$wsrep_cluster_size" -lt 2 ]]; then
        log "WARN: Cluster size too small ($wsrep_cluster_size) on node $host"
        return 1
    fi
    
    log "INFO: Node $host is healthy"
    return 0
}

update_proxysql_server_status() {
    local host=$1
    local status=$2
    
    mysql -h"$PROXYSQL_HOST" -P"$PROXYSQL_PORT" -u"$PROXYSQL_USER" -p"$PROXYSQL_PASS" \
        -e "UPDATE mysql_servers SET status='$status' WHERE hostname='$host';" 2>/dev/null || {
        log "ERROR: Failed to update ProxySQL server status for $host"
        return 1
    }
}

# Liste des nœuds à vérifier
GALERA_NODES=("mariadb_galera1" "mariadb_galera2" "mariadb_galera3")

# Vérifier chaque nœud
for node in "${GALERA_NODES[@]}"; do
    if check_galera_node "$node"; then
        update_proxysql_server_status "$node" "ONLINE"
    else
        log "ERROR: Node $node failed health check, marking as OFFLINE_SOFT"
        update_proxysql_server_status "$node" "OFFLINE_SOFT"
    fi
done

# Charger les changements dans ProxySQL runtime
mysql -h"$PROXYSQL_HOST" -P"$PROXYSQL_PORT" -u"$PROXYSQL_USER" -p"$PROXYSQL_PASS" \
    -e "LOAD MYSQL SERVERS TO RUNTIME;" 2>/dev/null || {
    log "ERROR: Failed to load servers to ProxySQL runtime"
    exit 1
}

log "INFO: Health check completed"