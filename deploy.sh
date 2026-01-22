#!/bin/bash
set -e

echo "Deploying production for badxclone..."

cd /var/www/badxclone.com/repo

git fetch origin
git checkout production
git reset --hard origin/production

sudo systemctl reload apache2

echo "Completed deployment."
