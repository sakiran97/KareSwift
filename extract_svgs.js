const fs = require('fs');

const data = fs.readFileSync('weblium.html', 'utf8');

// Extract SVGs
const svgRegex = /<svg[^>]*>[\s\S]*?<\/svg>/g;
const matches = data.match(svgRegex);

if (matches) {
  matches.forEach((svg, i) => {
    // Only print SVGs that look like the icons we need
    if (svg.includes('Smartphones') || svg.includes('stroke') || svg.includes('fill')) {
      if (svg.length < 1000) {
        console.log(`SVG ${i}: ${svg}\n`);
      }
    }
  });
}
