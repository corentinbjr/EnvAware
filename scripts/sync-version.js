/**
 * Syncs the version from package.json into manifest.json.
 * Called by release-it's after:bump hook.
 *
 * Usage: node scripts/sync-version.js 1.2.3
 */
const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
    console.error('Usage: node sync-version.js <version>');
    process.exit(1);
}

const manifestPath = path.join(__dirname, '..', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');
console.log(`manifest.json version updated to ${version}`);
