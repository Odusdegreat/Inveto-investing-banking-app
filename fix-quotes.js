const fs = require('fs');

let content = fs.readFileSync('app/card-link.tsx', 'utf8');
// Replace the problematic line with one without quotes
content = content.replace(/Tap 'Open Simulated Checkout' to simulate adding a card\./g, "Tap Open Simulated Checkout to simulate adding a card.");
fs.writeFileSync('app/card-link.tsx', content);
console.log('done');