const fs = require('fs');

const data = fs.readFileSync('weblium.html', 'utf8');

const titles = [
  'Poor Battery Life',
  'Water Damages',
  'Broken Speakers',
  'No WiFi or Bluetooth',
  'Cracked Screens'
];

titles.forEach(title => {
  // Find the index of the title
  const idx = data.indexOf(title);
  if (idx !== -1) {
    // Look backwards for the SVG
    const snippet = data.substring(Math.max(0, idx - 1500), idx);
    const match = snippet.match(/<svg[^>]*>[\s\S]*?<\/svg>/g);
    if (match && match.length > 0) {
      console.log(`\n--- ${title} ---`);
      console.log(match[match.length - 1]);
    }
  }
});
