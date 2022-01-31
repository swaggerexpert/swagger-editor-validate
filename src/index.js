const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const core = require('@actions/core');

const hasNoApiDefinition = async (page) =>
  page.evaluate(() => {
    const element = document.querySelector('.swagger-ui .loading-container h4');
    if (element === null) {
      return false;
    }
    return element.innerHTML === 'No API definition provided.';
  });

const isUnableToRenderDefinition = async (page) =>
  page.evaluate(() => {
    const element = document.querySelector('.swagger-ui .version-pragma');
    return element !== null;
  });

const hasErrors = async (page) =>
  page.evaluate(() => {
    const element = document.querySelector('.swagger-ui .errors-wrapper');
    return element !== null;
  });

const parseError = async (errorElement) => {
  const location = await errorElement.$eval('h4', (e) => e.innerText);
  const message = await errorElement.$eval('.message', (e) => e.innerText);
  const errorLine = await errorElement.$eval('.error-line', (e) => e.innerText);

  return {
    location,
    messages: message.split('\n'),
    lineNo: errorLine.replace('Jump to line ', ''),
  };
};

const parseErrors = async (page) => {
  const errorElements = await page.$$(
    '.swagger-ui .errors-wrapper .errors .error-wrapper'
  );
  const errors = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const errorElement of errorElements) {
    const error = await parseError(errorElement); // eslint-disable-line no-await-in-loop
    errors.push(error);
  }

  return errors;
};

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  let timeout = Number(core.getInput('timeout'));
  if (Number.isNaN(timeout)) {
    core.info(
      `Timeout must be a number, but instead got: ${timeout}. Will set to default of '30' (seconds).`
    );
    timeout = 30;
  }
  await page.setDefaultNavigationTimeout(timeout * 1000);
  const definitionFilePath = path.join(
    process.env.GITHUB_WORKSPACE,
    process.env.DEFINITION_FILE
  );

  try {
    const definition = fs.readFileSync(definitionFilePath).toString();

    await page.goto(process.env.SWAGGER_EDITOR_URL);
    await page.waitForSelector('.info .main .title');
    await page.evaluate((item) => {
      localStorage.setItem('swagger-editor-content', item);
    }, definition);
    await page.reload({ waitUntil: ['domcontentloaded', 'networkidle0'] });
    await page.waitForTimeout(10000);
    await page.waitForSelector('.swagger-ui div', { visible: true });

    if (await hasNoApiDefinition(page)) {
      // no API definition provided
      core.setFailed('\u001b[38;2;255;0;0mNo API definition provided.');
    } else if (await isUnableToRenderDefinition(page)) {
      // unable to render definition
      core.setFailed('\u001b[38;2;255;0;0mUnable to render this definition.');
    } else if (await hasErrors(page)) {
      // definition has errors
      core.setFailed('\u001b[38;2;255;0;1mDefinition contains errors.');
      const errors = await parseErrors(page);
      errors.forEach((error) => {
        core.error(error.location);
        error.messages.forEach((message) => core.error(message));
        core.error(`at line ${error.lineNo}`);
        core.error('');
      });
    } else {
      core.info('\u001b[1mDefinition successfully validated by Swagger Editor');
    }
  } catch (error) {
    core.setFailed('Error while validating in Swagger Editor');
    core.error(error);
  } finally {
    await browser.close();
  }
})();
