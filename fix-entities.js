const fs = require('fs');

let content = fs.readFileSync('app/card-link.tsx', 'utf8');
content = content.replace(/Tap "Open Simulated Checkout"/g, 'Tap "Open Simulated Checkout"');
fs.writeFileSync('app/card-link.tsx', content);
console.log('done card-link');