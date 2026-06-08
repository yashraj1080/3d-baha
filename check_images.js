const fs = require('fs');
const path = require('path');

const dir = 'e:/projects/baha 3d final/sponsors';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.jpg')) {
    const filePath = path.join(dir, file);
    const buffer = fs.readFileSync(filePath);
    
    // Simple JPEG size parser
    let i = 2;
    let width = 0, height = 0;
    while (i < buffer.length) {
      if (buffer[i] === 0xFF && buffer[i+1] === 0xC0) {
        height = buffer[i+5] * 256 + buffer[i+6];
        width = buffer[i+7] * 256 + buffer[i+8];
        break;
      }
      i++;
    }
    console.log(`${file}: ${width}x${height}`);
  }
});
