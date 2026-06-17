const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  // Red (Danger)
  { regex: /bg-red-50(\/\d+)?\s+dark:bg-red-\d+(\/\d+)?/g, replace: 'bg-danger-bg' },
  { regex: /text-red-\d+\s+dark:text-red-\d+/g, replace: 'text-danger' },
  { regex: /border-red-\d+\s+dark:border-red-\d+(\/\d+)?/g, replace: 'border-danger-border' },
  { regex: /bg-red-\d+\s+text-white/g, replace: 'bg-danger text-white' }, // usually action buttons

  // Green (Success)
  { regex: /bg-green-50(\/\d+)?\s+dark:bg-green-\d+(\/\d+)?/g, replace: 'bg-success-bg' },
  { regex: /text-green-\d+\s+dark:text-green-\d+/g, replace: 'text-success' },
  { regex: /border-green-\d+\s+dark:border-green-\d+(\/\d+)?/g, replace: 'border-success-border' },

  // Amber (Warning)
  { regex: /bg-amber-50(\/\d+)?\s+dark:bg-amber-\d+(\/\d+)?/g, replace: 'bg-warning-bg' },
  { regex: /text-amber-\d+\s+dark:text-amber-\d+/g, replace: 'text-warning' },
  { regex: /border-amber-\d+(\/\d+)?\s+dark:border-amber-\d+(\/\d+)?/g, replace: 'border-warning-border' },

  // Primary toggle combinations
  { regex: /bg-black\s+text-white\s+dark:bg-white\s+dark:text-black/g, replace: 'bg-primary text-primary-text' },
  { regex: /border-black\s+dark:border-white/g, replace: 'border-primary' },
  { regex: /border-white\s+dark:border-black/g, replace: 'border-primary' }, // inverted
  { regex: /bg-black\s+hover:bg-zinc-\d+\s+dark:bg-white\s+dark:hover:bg-zinc-\d+/g, replace: 'bg-primary hover:bg-primary-hover text-primary-text' },
  
  // Generic Zinc pairs with hovers/focuses
  { regex: /hover:bg-zinc-\d+(\/\d+)?\s+dark:hover:bg-zinc-\d+(\/\d+)?/g, replace: 'hover:bg-surface-hover' },
  { regex: /focus:bg-white\s+dark:focus:bg-zinc-\d+/g, replace: 'focus:bg-surface' },
  { regex: /focus:bg-zinc-\d+\s+dark:focus:bg-zinc-\d+/g, replace: 'focus:bg-surface' },
  { regex: /text-zinc-\d+\s+hover:text-zinc-\d+\s+dark:hover:text-zinc-\d+/g, replace: 'text-muted hover:text-secondary' },
  { regex: /bg-zinc-\d+(\/\d+)?\s+dark:bg-zinc-\d+(\/\d+)?/g, replace: 'bg-surface' },
  { regex: /text-zinc-\d+\s+dark:text-zinc-\d+/g, replace: 'text-secondary' },
  { regex: /border-zinc-\d+(\/\d+)?\s+dark:border-zinc-\d+(\/\d+)?/g, replace: 'border-border' },
  { regex: /divide-zinc-\d+\s+dark:divide-zinc-\d+/g, replace: 'divide-border' },
  
  // Specific straggler fixes from the grep search
  { regex: /bg-black\s+dark:bg-white/g, replace: 'bg-primary' },
  { regex: /text-black\s+dark:text-white/g, replace: 'text-primary' },
  { regex: /text-zinc-950\s+dark:text-white/g, replace: 'text-primary' },
  { regex: /bg-white\s+dark:bg-zinc-800/g, replace: 'bg-surface' },

  // Just strip lingering dark classes that no longer have a light counterpart
  { regex: /\bdark:hover:[a-z0-9-\/:]+\b/g, replace: '' },
  { regex: /\bdark:focus:[a-z0-9-\/:]+\b/g, replace: '' },
  { regex: /\bdark:[a-z0-9-\/:]+\b/g, replace: '' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      // Loop multiple times
      for (let i = 0; i < 3; i++) {
        for (const { regex, replace } of replacements) {
          content = content.replace(regex, replace);
        }
      }

      // Cleanup duplicate whitespace from removing classes
      content = content.replace(/ \s+/g, ' ');
      content = content.replace(/className="\s+/g, 'className="');
      content = content.replace(/\s+"/g, '"');
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Second pass refactoring complete!');
