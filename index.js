'use strict';

const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost/');

    const title = await page.title();
    console.dir(title);

    await browser.close();
})();