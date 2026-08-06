import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const ICON_MAP = {
  FaArrowLeft: 'arrow_back',
  FaBell: 'notifications',
  FaBellSlash: 'notifications_off',
  FaBoxesStacked: 'inventory_2',
  FaChartLine: 'bar_chart',
  FaCheck: 'check',
  FaCheckDouble: 'done_all',
  FaChevronDown: 'expand_more',
  FaChevronRight: 'chevron_right',
  FaCircleCheck: 'check_circle',
  FaCircleExclamation: 'error',
  FaCircleInfo: 'info',
  FaClipboardList: 'assignment',
  FaDownload: 'download',
  FaEye: 'visibility',
  FaEyeSlash: 'visibility_off',
  FaFilePdf: 'picture_as_pdf',
  FaGears: 'settings',
  FaImage: 'image',
  FaLocationDot: 'location_on',
  FaMagnifyingGlass: 'search',
  FaMoneyBill: 'payments',
  FaPaperPlane: 'send',
  FaPhone: 'call',
  FaPlus: 'add',
  FaPrint: 'print',
  FaRegCommentDots: 'chat',
  FaRulerCombined: 'straighten',
  FaScissors: 'content_cut',
  FaShareFromSquare: 'ios_share',
  FaSpinner: 'progress_activity',
  FaSquarePlus: 'add_box',
  FaStar: 'star',
  FaTrash: 'delete',
  FaTriangleExclamation: 'warning',
  FaUserSlash: 'person_off',
  FaUsers: 'group',
  FaWifi: 'wifi',
  FaXmark: 'close'
};

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

const allFiles = [
  ...getAllTsxFiles(path.join(rootDir, 'app')),
  ...getAllTsxFiles(path.join(rootDir, 'components')),
  ...getAllTsxFiles(path.join(rootDir, 'lib'))
];

const newIconsUsed = new Set();

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let fileNeedsSymbolImport = false;

  // 1. Process literal tags <FaXmark ... />
  for (const [faName, symName] of Object.entries(ICON_MAP)) {
    const regex = new RegExp(`<${faName}(\\s|>)`, 'g');
    if (regex.test(content)) {
      fileNeedsSymbolImport = true;
      newIconsUsed.add(symName);
      // Replace <FaXmark with <Symbol name="close"
      content = content.replace(new RegExp(`<${faName}\\b`, 'g'), `<Symbol name="${symName}"`);
      // Also, if it has no children, we must ensure it's closed properly. Symbol doesn't take children typically but if they wrote <FaXmark /> it becomes <Symbol name="..." />
    }
  }

  // 2. Process data array mappings (like lib/constants.ts)
  for (const [faName, symName] of Object.entries(ICON_MAP)) {
    const regex = new RegExp(`['"]${faName}['"]`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `'${symName}'`);
      newIconsUsed.add(symName);
    }
  }

  // 3. Process the react-icons import
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]react-icons\/fa6?['"];?/g;
  content = content.replace(importRegex, (match, importsStr) => {
    let imports = importsStr.split(',').map(s => s.trim()).filter(Boolean);
    let remainingImports = imports.filter(i => !ICON_MAP[i]);
    
    if (remainingImports.length > 0) {
      return `import { ${remainingImports.join(', ')} } from 'react-icons/fa6';`;
    } else {
      return '';
    }
  });

  // 4. Inject Symbol import if needed
  if (fileNeedsSymbolImport && content !== originalContent) {
    if (!content.includes("import Symbol from '@/components/ui/Symbol/Symbol'")) {
      // Find the last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLine + 1) + "import Symbol from '@/components/ui/Symbol/Symbol';\n" + content.slice(endOfLine + 1);
      } else {
        content = "import Symbol from '@/components/ui/Symbol/Symbol';\n" + content;
      }
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}

// 5. Update layout.tsx
const layoutPath = path.join(rootDir, 'app', 'layout.tsx');
let layoutContent = fs.readFileSync(layoutPath, 'utf8');
const match = layoutContent.match(/&icon_names=([^&"]+)&/);
if (match) {
  const bundledIcons = new Set(match[1].split(','));
  for (const icon of newIconsUsed) {
    bundledIcons.add(icon);
  }
  const newIconNames = Array.from(bundledIcons).sort().join(',');
  layoutContent = layoutContent.replace(/&icon_names=[^&"]+&/, `&icon_names=${newIconNames}&`);
  fs.writeFileSync(layoutPath, layoutContent);
  console.log('Updated layout.tsx with new icons');
}

console.log('Migration complete!');
