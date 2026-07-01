const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'temp_images');

const files = fs.readdirSync(dir);
console.log("Checking for PNGs...");
files.forEach(file => {
  const filePath = path.join(dir, file);
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(4);
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);
  
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    console.log(`${file} is a PNG! Size: ${fs.statSync(filePath).size} bytes`);
  }
});
