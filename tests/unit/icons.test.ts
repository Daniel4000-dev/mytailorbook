import { test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SVG_ICONS } from '@/components/ui/Symbol/iconRegistry';

function getAllTsxFiles(dir: string, fileList: string[] = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        getAllTsxFiles(filePath, fileList);
      }
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

test('all used icons across app, components, and lib are mapped in SVG_ICONS', () => {
  const registeredIcons = new Set(Object.keys(SVG_ICONS));
  expect(registeredIcons.size).toBeGreaterThanOrEqual(140);

  const allFiles = [
    ...getAllTsxFiles(path.join(process.cwd(), 'app')),
    ...getAllTsxFiles(path.join(process.cwd(), 'components')),
    ...getAllTsxFiles(path.join(process.cwd(), 'lib')),
  ];

  const missingIcons = new Set<string>();

  const literalRegex = /<Symbol[^>]+name=(?:\{["']([a-z_0-9]+)["']\}|["']([a-z_0-9]+)["'])/g;
  const objectPropRegex = /icon:\s*['"]([a-z_0-9]+)['"]/g;
  const ternaryRegex = /name=\{[^}]*?['"]([a-z_0-9]+)['"]\s*:\s*['"]([a-z_0-9]+)['"]/g;

  for (const file of allFiles) {
    if (file.includes('previous_sidebar') || file.includes('iconRegistry.tsx')) continue;
    const content = fs.readFileSync(file, 'utf8');
    let m;

    while ((m = literalRegex.exec(content)) !== null) {
      const name = m[1] || m[2];
      if (!registeredIcons.has(name)) missingIcons.add(name);
    }

    while ((m = objectPropRegex.exec(content)) !== null) {
      const name = m[1];
      if (name.toLowerCase() === name && !name.startsWith('fa') && !name.startsWith('http')) {
        if (!registeredIcons.has(name)) missingIcons.add(name);
      }
    }

    while ((m = ternaryRegex.exec(content)) !== null) {
      if (!registeredIcons.has(m[1])) missingIcons.add(m[1]);
      if (!registeredIcons.has(m[2])) missingIcons.add(m[2]);
    }
  }

  expect(Array.from(missingIcons)).toEqual([]);
});
