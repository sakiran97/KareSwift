const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'temp_images');

const files = fs.readdirSync(dir);
files.forEach(file => {
  const filePath = path.join(dir, file);
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(24);
  fs.readSync(fd, buffer, 0, 24, 0);
  fs.closeSync(fd);
  
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    console.log(`${file} - ${width}x${height} - Size: ${fs.statSync(filePath).size} bytes`);
  }
});
