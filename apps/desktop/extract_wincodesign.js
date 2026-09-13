const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const cacheDir = 'C:\\Users\\junai\\AppData\\Local\\electron-builder\\Cache\\winCodeSign';
const targetDir = path.join(cacheDir, 'winCodeSign-2.6.0');
const tool7z = path.resolve(__dirname, '../../node_modules/7zip-bin/win/x64/7za.exe');

if (fs.existsSync(cacheDir)) {
  const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.7z'));
  if (files.length > 0) {
    const archivePath = path.join(cacheDir, files[0]);
    console.log(`Extracting ${archivePath} to ${targetDir}...`);
    try {
      execSync(`"${tool7z}" x -y "${archivePath}" "-o${targetDir}"`, { stdio: 'inherit' });
    } catch (e) {
      console.log('Finished extraction with warnings (ignoring symlinks).');
    }
  }
}
