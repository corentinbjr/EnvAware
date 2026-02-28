/**
 * Creates a zip of the extension files for Chrome Web Store upload.
 * Called by release-it's after:bump hook.
 *
 * Usage: npm run zip
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const outName = `envaware-v${pkg.version}.zip`;

// Remove old zip if it exists
const outPath = path.join(root, outName);
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

// Files and directories to include
const include = [
    'manifest.json',
    'popup.html',
    'options.html',
    'css/',
    'js/',
    'icons/'
];

// Use PowerShell on Windows, zip on Unix
const isWin = process.platform === 'win32';

if (isWin) {
    // Use PowerShell Compress-Archive
    const items = include.map(f => `"${path.join(root, f)}"`).join(', ');
    execSync(
        `powershell -Command "Compress-Archive -Path ${items} -DestinationPath '${outPath}' -Force"`,
        { cwd: root, stdio: 'inherit' }
    );
} else {
    execSync(
        `zip -r "${outName}" ${include.join(' ')}`,
        { cwd: root, stdio: 'inherit' }
    );
}

console.log(`Created ${outName}`);
