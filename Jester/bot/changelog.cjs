const { chromium } = require('playwright');
async function run() {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('https://fluxerjs.blstmo.com/changelog?version=1.2.2', { waitUntil: 'load' });
    // wait 1s just in case
    await new Promise(r => setTimeout(r, 1000));
    const text = await page.evaluate(() => document.body.innerText);
    console.log('CHANGELOG_START');
    console.log(text);
    console.log('CHANGELOG_END');
    await browser.close();
}
run();
