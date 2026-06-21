const puppeteer = require('puppeteer');

async function test() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  console.log('Opening login page...');
  await page.goto('http://192.168.0.1/', { waitUntil: 'networkidle0' });
  
  console.log('Entering admin password...');
  await page.waitForSelector('input[type="password"]');
  await page.type('input[type="password"]', 'room304');
  await page.keyboard.press('Enter');
  
  console.log('Waiting for login redirect...');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('Navigating to #networkBasic...');
  await page.goto('http://192.168.0.1/#networkBasic', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 5000));
  
  // Dump all input elements with their attributes (id, class, name, placeholder, value, etc.)
  const inputsInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, button'));
    return inputs.map(i => ({
      tagName: i.tagName,
      type: i.type,
      id: i.id,
      className: i.className,
      name: i.name,
      placeholder: i.placeholder,
      value: i.value,
      visible: i.offsetParent !== null,
      parentText: i.parentElement?.textContent?.trim().slice(0, 100)
    }));
  });
  
  console.log('=== All visible input elements ===');
  inputsInfo.filter(i => i.visible).forEach(i => console.log(JSON.stringify(i)));

  console.log('=== All hidden input elements ===');
  inputsInfo.filter(i => !i.visible).forEach(i => console.log(JSON.stringify(i)));

  // Save the DOM HTML
  const fs = require('fs');
  const html = await page.content();
  fs.writeFileSync('router_dom.html', html);
  console.log('DOM written to router_dom.html');

  await browser.close();
}

test().catch(console.error);
