#!/bin/bash

# WhatsApp Bot Backup Script

BACKUP_DIR="/opt/whatsapp-bot/backups"
APP_DIR="/opt/whatsapp-bot"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="whatsapp-bot-backup-$DATE.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating backup..."
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    --exclude="node_modules" \
    --exclude="logs/*.log" \
    --exclude="storage/browser/*" \
    -C "$(dirname "$APP_DIR")" "$(basename "$APP_DIR")"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "whatsapp-bot-backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/$BACKUP_FILE"