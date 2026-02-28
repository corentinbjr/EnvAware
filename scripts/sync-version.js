/**
 * Syncs the version into manifest.json and package.json.
 * Called by release-it's after:bump hook (npm is disabled so we do it ourselves).
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

const root = path.join(__dirname, '..');

['manifest.json', 'package.json'].forEach(file => {
    const filePath = path.join(root, file);
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    json.version = version;
    fs.writeFileSync(filePath, JSON.stringify(json, null, 4) + '\n');
    console.log(`${file} version updated to ${version}`);
});
