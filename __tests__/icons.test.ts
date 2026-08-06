import { test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function getAllTsxFiles(dir: string, fileList: string[] = []) {
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

test('all used Material Symbols are included in the Google Fonts subset in layout.tsx', () => {
  const layoutPath = path.join(process.cwd(), 'app', 'layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  
  const match = layoutContent.match(/&icon_names=([^&"]+)&/);
  expect(match).toBeTruthy();
  
  const bundledIcons = new Set(match![1].split(','));
  const allFiles = [
    ...getAllTsxFiles(path.join(process.cwd(), 'app')),
    ...getAllTsxFiles(path.join(process.cwd(), 'components')),
    ...getAllTsxFiles(path.join(process.cwd(), 'lib'))
  ];
  
  const missingIcons = new Set<string>();
  
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
  
  expect(Array.from(missingIcons)).toEqual([]);
});
