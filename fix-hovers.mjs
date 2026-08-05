import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import postcss from 'postcss';

const plugin = () => {
  return {
    postcssPlugin: 'postcss-hover-fix',
    Rule(rule) {
      if (rule.selector.includes(':hover')) {
        let current = rule.parent;
        let isWrapped = false;
        while (current) {
          if (current.type === 'atrule' && current.name === 'media' && current.params.includes('hover: hover')) {
            isWrapped = true;
            break;
          }
          current = current.parent;
        }
        
        if (!isWrapped) {
          const media = postcss.atRule({
            name: 'media',
            params: '(hover: hover) and (pointer: fine)',
            source: rule.source
          });
          
          rule.replaceWith(media);
          media.append(rule);
        }
      }
    }
  };
};
plugin.postcss = true;

const processor = postcss([plugin()]);

const files = globSync('**/*.css', { ignore: ['node_modules/**', '.next/**'] });

async function processFiles() {
  for (const file of files) {
    const css = fs.readFileSync(file, 'utf8');
    if (!css.includes(':hover')) continue;
    
    const result = await processor.process(css, { from: file, to: file });
    fs.writeFileSync(file, result.css);
    console.log(`Fixed ${file}`);
  }
}

processFiles().catch(console.error);
