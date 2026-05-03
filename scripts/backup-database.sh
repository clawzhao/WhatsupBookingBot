#!/bin/bash

BACKUP_DIR="./backups"
DB_FILE="./instance/app.sqlite"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_FILE" ]; then
  cp "$DB_FILE" "$BACKUP_FILE"
  echo "✅ Database backed up to $BACKUP_FILE"
  
  # Keep only last 7 backups
  ls -t "$BACKUP_DIR"/backup_*.db | tail -n +8 | xargs rm -f 2>/dev/null
  echo "✅ Old backups cleaned (kept last 7)"
else
  echo "❌ Database file not found at $DB_FILE"
  exit 1
fi
