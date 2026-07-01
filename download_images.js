const https = require('https');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'temp_images');

https.get('https://phone-repair.weblium.site/', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    const regex = /(?:https?:)?\/\/res2\.weblium\.site\/res\/[a-zA-Z0-9_]+\/([a-zA-Z0-9_]+)/g;
    let match;
    const uniqueUrls = new Map();
    while ((match = regex.exec(data)) !== null) {
      uniqueUrls.set(match[1], 'https:' + match[0]);
    }
    
    console.log(`Found ${uniqueUrls.size} unique images. Downloading...`);
    
    uniqueUrls.forEach((url, name) => {
      https.get(url, (imgResp) => {
        const dest = path.join(outDir, name + '.jpg');
        const file = fs.createWriteStream(dest);
        imgResp.pipe(file);
        file.on('finish', () => {
          file.close();
          const stats = fs.statSync(dest);
          console.log(`${name}.jpg - Size: ${stats.size} bytes`);
        });
      }).on('error', (err) => {
         console.error(`Error downloading ${name}: ${err.message}`);
      });
    });
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
