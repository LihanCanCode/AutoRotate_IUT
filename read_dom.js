const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('router_dom.html', 'utf8');
const $ = cheerio.load(html);

console.log('=== Save Button HTML ===');
const saveBtn = $('#save-data');
console.log('Save button outerHTML:');
console.log($.html(saveBtn));
console.log('Save button inner elements:');
saveBtn.find('*').each((i, el) => {
  console.log(`  Tag: ${el.tagName}, ID: ${$(el).attr('id') || ''}, Class: ${$(el).attr('class') || ''}, Text: "${$(el).text().trim()}"`);
});
