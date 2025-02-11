import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import core from '@actions/core';

let ignoreErrorPredicate;
if (process.env.IGNORE_ERROR) {
  const predicatePath = path.join(
    process.env.GITHUB_WORKSPACE,
    process.env.IGNORE_ERROR
  );
  try {
    ({ default: ignoreErrorPredicate } = await import(predicatePath));
  } catch {
    ignoreErrorPredicate = null;
  }
}

const shouldIgnoreError = (error) => {
  if (typeof ignoreErrorPredicate === 'function') {
    return ignoreErrorPredicate(error);
  }

  return false;
};

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

const parseError = async (errorElement) => {
  const location = await errorElement.$eval('h4', (e) => e.innerText);
  const message = await errorElement.$eval('.message', (e) => e.innerText);
  const errorLine = await errorElement.$eval('.error-line', (e) => e.innerText);

  return {
    location,
    message,
    lineNo: Number(errorLine.replace('Jump to line ', '')),
  };
};

const parseErrors = async (page) => {
  const errors = [];

  try {
    await page.waitForSelector(
      '.swagger-ui .errors-wrapper .errors .error-wrapper',
      { visible: true }
    );
  } catch {
    return errors;
  }

  const errorElements = await page.$$(
    '.swagger-ui .errors-wrapper .errors .error-wrapper'
  );

  // eslint-disable-next-line no-restricted-syntax
  for (const errorElement of errorElements) {
    const error = await parseError(errorElement); // eslint-disable-line no-await-in-loop
    errors.push(error);
  }

  return errors;
};

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
const definitionFilePath = path.join(
  process.env.GITHUB_WORKSPACE,
  process.env.DEFINITION_FILE
);
const defaultTimeout = parseInt(process.env.DEFAULT_TIMEOUT || '10000', 10);

try {
  const definition = fs.readFileSync(definitionFilePath).toString();

  page.setDefaultTimeout(defaultTimeout);
  await page.goto(process.env.SWAGGER_EDITOR_URL);
  await page.waitForSelector('.info .main .title', { visible: true });
  await page.waitForSelector('.ace_text-input', { visible: true });

  await page.focus('.ace_text-input');
  // select all
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  // cut
  await page.keyboard.down('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.up('Control');
  await page.waitForFunction(
    (text) => document.body.innerText.includes(text),
    {},
    'No API definition provided'
  );
  // paste in the OpenAPI description
  await page.evaluate(
    (selector, text) => {
      const inputElement = document.querySelector(selector);
      if (inputElement) {
        inputElement.value = text;
        inputElement.dispatchEvent(new Event('input', { bubbles: true })); // Trigger input event
      }
    },
    '.ace_text-input',
    definition
  );

  // new definition rendered
  await page.waitForSelector('.swagger-ui div:nth-child(2)', {
    visible: true,
  });

  const errors = (await parseErrors(page)).filter(
    (error) => !shouldIgnoreError(error)
  );

  if (await hasNoApiDefinition(page)) {
    // no API definition provided
    core.setFailed('\u001b[38;2;255;0;0mNo API definition provided.');
  } else if (await isUnableToRenderDefinition(page)) {
    // unable to render definition
    core.setFailed('\u001b[38;2;255;0;0mUnable to render this definition.');
  } else if (errors.length > 0) {
    // definition has errors
    core.setFailed('\u001b[38;2;255;0;1mDefinition contains errors.');
    errors.forEach((error) => {
      core.error(error.location);
      error.message.split('\n').forEach((message) => core.error(message));
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
