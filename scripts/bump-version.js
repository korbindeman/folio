#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const VALID_BUMP_TYPES = ['major', 'minor', 'patch'];

function showUsage() {
  console.log('Usage: bun scripts/bump-version.js <major|minor|patch>');
  console.log('');
  console.log('Examples:');
  console.log('  bun scripts/bump-version.js patch   # 0.3.5 -> 0.3.6');
  console.log('  bun scripts/bump-version.js minor   # 0.3.5 -> 0.4.0');
  console.log('  bun scripts/bump-version.js major   # 0.3.5 -> 1.0.0');
  process.exit(1);
}

function parseVersion(versionString) {
  const parts = versionString.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${versionString}`);
  }
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10),
  };
}

function bumpVersion(version, bumpType) {
  const newVersion = { ...version };

  switch (bumpType) {
    case 'major':
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case 'minor':
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case 'patch':
      newVersion.patch += 1;
      break;
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }

  return newVersion;
}

function versionToString(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function main() {
  const bumpType = process.argv[2];

  if (!bumpType || !VALID_BUMP_TYPES.includes(bumpType)) {
    console.error(bumpType
      ? `Error: Invalid bump type '${bumpType}'`
      : 'Error: Bump type is required'
    );
    console.error('');
    showUsage();
  }

  // Read Cargo.toml
  const cargoTomlPath = resolve(process.cwd(), 'Cargo.toml');
  let cargoToml = readFileSync(cargoTomlPath, 'utf-8');

  // Extract current version
  const versionMatch = cargoToml.match(/^version = "([^"]+)"/m);
  if (!versionMatch) {
    console.error('Error: Could not find version in Cargo.toml');
    process.exit(1);
  }

  const currentVersionString = versionMatch[1];
  const currentVersion = parseVersion(currentVersionString);
  const newVersion = bumpVersion(currentVersion, bumpType);
  const newVersionString = versionToString(newVersion);

  console.log(`Current version: ${currentVersionString}`);
  console.log(`New version: ${newVersionString}`);
  console.log('');

  // Update Cargo.toml
  cargoToml = cargoToml.replace(
    /^version = "[^"]+"$/m,
    `version = "${newVersionString}"`
  );
  writeFileSync(cargoTomlPath, cargoToml, 'utf-8');
  console.log('✓ Updated Cargo.toml');

  // Update Cargo.lock
  try {
    execSync('cargo update -p zinnia_core -p zinnia_frontend', {
      stdio: 'inherit',
    });
    console.log('✓ Updated Cargo.lock');
  } catch (error) {
    console.error('Error: Failed to update Cargo.lock');
    process.exit(1);
  }

  console.log('');
  console.log(`✓ Version bumped from ${currentVersionString} to ${newVersionString}`);
  console.log("Don't forget to commit these changes!");
}

main();
