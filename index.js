'use strict';

const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost/');
    await page.evaluate(() => {
       localStorage.setItem('swagger-editor-content', 'test');
    });
    await page.goto('http://localhost/');
    const title = await page.title();
    console.dir(title);

    await browser.close();
})();