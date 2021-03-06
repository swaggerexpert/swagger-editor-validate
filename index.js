'use strict';

const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true, slowMo: 2000 });
    const page = await browser.newPage();
    await page.goto('http://localhost/');
    await page.evaluate(() => {
       localStorage.setItem('swagger-editor-content', 'test');
    });
    await page.reload();

    // no API definition provided
    const noApiDefinition = await page.evaluate(() => {
       const element = document.querySelector('.swagger-ui .loading-container h4');
       console.dir(element);
       if (element === null) {
           return false;
       }
       return element.innerHTML === 'No API definition provided.';
    });
    if (noApiDefinition) {
        console.error('No API definition provided.')
        process.exit(1);
    }

    // unable to render definition
    const unableToRenderDefinition = await page.evaluate(() => {
       const element = document.querySelector('.swagger-ui .version-pragma');
       return element !== null;
    });
    if (unableToRenderDefinition) {
        console.error('Unable to render this definition.')
        process.exit(1)
    }

    await browser.close();
})();