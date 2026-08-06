import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function getAllTsxFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllTsxFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const layoutPath = path.join(rootDir, 'app', 'layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

const match = layoutContent.match(/&icon_names=([^&"]+)&/);
if (!match) process.exit(1);

const bundledIcons = new Set(match[1].split(','));
const allFiles = [
  ...getAllTsxFiles(path.join(rootDir, 'app')),
  ...getAllTsxFiles(path.join(rootDir, 'components')),
  ...getAllTsxFiles(path.join(rootDir, 'lib'))
];

const missingIcons = new Set();
const literalRegex = /<Symbol[^>]+name="([a-z_0-9]+)"/g;
const objectPropRegex = /icon:\s*['"]([a-z_0-9]+)['"]/g;
const mapValueRegex = /Fa[A-Za-z]+:\s*['"]([a-z_0-9]+)['"]/g;

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  
  while ((m = literalRegex.exec(content)) !== null) {
    if (!bundledIcons.has(m[1])) missingIcons.add(m[1]);
  }
  
  while ((m = objectPropRegex.exec(content)) !== null) {
    if (m[1].toLowerCase() === m[1] && !m[1].startsWith('fa')) {
      if (!bundledIcons.has(m[1])) missingIcons.add(m[1]);
    }
  }
  
  if (file.includes('BottomNav.tsx')) {
    while ((m = mapValueRegex.exec(content)) !== null) {
      if (!bundledIcons.has(m[1])) missingIcons.add(m[1]);
    }
  }
}

if (missingIcons.size > 0) {
  console.error('❌ Missing icons:', Array.from(missingIcons).join(', '));
  process.exit(1);
} else {
  console.log('✅ All icons are correctly bundled.');
  process.exit(0);
}
