const https = require('https');
const fs = require('fs');

https.get('https://phone-repair.weblium.site/', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    // Write data to file to inspect later if needed
    fs.writeFileSync('weblium.html', data);
    
    // Look for image URLs, including those without http
    const regex = /(?:https?:)?\/\/res2\.weblium\.site\/res\/[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g;
    const matches = data.match(regex);
    if (matches) {
      const uniqueUrls = [...new Set(matches)];
      console.log("Found images:");
      uniqueUrls.forEach(url => console.log(url));
    } else {
      console.log("No images found.");
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
