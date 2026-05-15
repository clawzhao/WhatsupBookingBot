const fs = require('fs');
const content = fs.readFileSync('src/telegram.js', 'utf8');
const lines = content.split('\n');

for (let i = 50; i < 60; i++) {
    const line = lines[i];
    console.log(`Line ${i+1}: ${line}`);
    const buffer = Buffer.from(line);
    console.log(`Hex: ${buffer.toString('hex')}`);
}

for (let i = 750; i < 765; i++) {
    const line = lines[i];
    console.log(`Line ${i+1}: ${line}`);
    const buffer = Buffer.from(line);
    console.log(`Hex: ${buffer.toString('hex')}`);
}
