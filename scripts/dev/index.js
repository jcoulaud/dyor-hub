#!/usr/bin/env node

/**
 * Main development environment setup script for DYOR Hub
 * This script coordinates all development environment setup tasks
 */

const path = require('path');
const { spawn, execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Print a welcome banner
function printWelcomeBanner() {
  const title = 'DYOR Hub Development Environment Setup';
  const width = title.length + 8;
  const line = '═'.repeat(width);

  console.log(`\n${colors.magenta}╔${line}╗${colors.reset}`);
  console.log(
    `${colors.magenta}║${colors.reset}   ${colors.bold}${title}${colors.reset}   ${colors.magenta}║${colors.reset}`,
  );
  console.log(`${colors.magenta}╚${line}╝${colors.reset}\n`);
}

// Run a script and wait for it to complete
function runScript(scriptPath, scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`${colors.yellow}Running ${scriptName}...${colors.reset}`);

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${scriptPath} exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// Main function
async function main() {
  printWelcomeBanner();

  try {
    // Step 1: Setup environment variables
    await runScript(path.join(__dirname, 'setup-env.js'), 'environment setup');

    // Step 2: Check SSL certificates
    // const checkCertsResult = require('./check-certs.js');
    // const certsOk = await checkCertsResult();

    // if (!certsOk) {
    //   console.log(
    //     `\n${colors.yellow}${colors.bold}Please set up HTTPS certificates before continuing.${colors.reset}`,
    //   );
    //   console.log(
    //     `${colors.yellow}Once certificates are installed, run this script again.${colors.reset}\n`,
    //   );
    //   process.exit(0);
    // }

    // Step 3: Start Docker containers
    await runScript(path.join(__dirname, 'docker-up.js'), 'docker startup');
  } catch (error) {
    console.error(`\n${colors.red}${colors.bold}Setup failed:${colors.reset} ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
