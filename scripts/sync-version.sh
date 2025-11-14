#!/bin/bash

# Sync version from root Cargo.toml to package.json
# Note: tauri.conf.json automatically reads version from Cargo.toml

# Get version from root Cargo.toml
VERSION=$(grep -m 1 '^version = ' Cargo.toml | sed 's/version = "\(.*\)"/\1/')

if [ -z "$VERSION" ]; then
  echo "Error: Could not extract version from Cargo.toml"
  exit 1
fi

echo "Syncing version: $VERSION"

# Update package.json
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" crates/frontend/package.json
rm -f crates/frontend/package.json.bak

echo "✓ Version synced to $VERSION in package.json"
echo "  (tauri.conf.json reads version from Cargo.toml automatically)"
