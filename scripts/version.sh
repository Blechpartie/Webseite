#!/usr/bin/env bash
# Hängt beim Netlify-Build eine eindeutige Version an CSS/JS an
# (Datum und Uhrzeit, z. B. style.css?v=20261027-1432). Neue Deploys
# laden damit sofort die neuen Dateien, alte bleiben lange im Browser-Cache.
set -euo pipefail
version="$(TZ=Europe/Berlin date +%Y%m%d-%H%M)"
sed -i "s/?v=dev\"/?v=${version}\"/g" public/*.html
echo "CSS/JS-Version: ${version}"
