'use strict';

const exec = require('child_process').exec;
exec('npm ci').stderr.pipe(process.stderr);
console.info('Installed dependencies');
