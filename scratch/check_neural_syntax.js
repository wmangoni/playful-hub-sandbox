const fs = require('fs');
const vm = require('vm');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'rede_neural_evolutiva', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract all <script> blocks
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let blockIndex = 1;
let hasError = false;

while ((match = scriptRegex.exec(html)) !== null) {
  const code = match[1];
  if (!code.trim()) continue;
  
  console.log(`Checking script block ${blockIndex}...`);
  try {
    new vm.Script(code, { filename: `script_block_${blockIndex}.js` });
    console.log(`Block ${blockIndex} is syntax-OK.`);
  } catch (err) {
    hasError = true;
    console.error(`Syntax error in block ${blockIndex}:`, err.message);
    // Print lines around the error
    const lines = code.split('\n');
    const errLineMatch = err.stack.match(/script_block_\d+\.js:(\d+)/);
    if (errLineMatch) {
      const lineNum = parseInt(errLineMatch[1], 10);
      console.error(`Error around line ${lineNum}:`);
      const start = Math.max(0, lineNum - 5);
      const end = Math.min(lines.length - 1, lineNum + 5);
      for (let i = start; i <= end; i++) {
        console.error(`${i + 1}: ${lines[i]}`);
      }
    } else {
      console.error(err.stack);
    }
  }
  blockIndex++;
}

if (hasError) {
  process.exit(1);
} else {
  console.log('All script blocks are syntactically correct.');
  process.exit(0);
}
