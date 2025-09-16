#!/bin/bash

# Mise à jour des paquets
apt-get update

# Installer la version la plus récente d'OpenSSL disponible
echo "Installation de la version la plus récente d'OpenSSL"
apt-get install -y --no-install-recommends openssl

rm -rf /var/lib/apt/lists/*

# Vérification de la version
echo "OpenSSL version:"
openssl version

# Exécution de la commande originale
exec "$@"
