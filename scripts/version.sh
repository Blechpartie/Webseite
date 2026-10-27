#!/usr/bin/env bash
# Hängt beim Netlify-Build eine eindeutige Version an CSS/JS an
# (Datum + Commit, z. B. style.css?v=20261027-265b85d). Neue Deploys
# laden damit sofort die neuen Dateien, alte bleiben lange im Browser-Cache.
set -euo pipefail
version="$(date -u +%Y%m%d)-${COMMIT_REF:-local}"
version="${version:0:16}"
sed -i "s/?v=dev\"/?v=${version}\"/g" public/*.html
echo "CSS/JS-Version: ${version}"
