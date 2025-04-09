#!/usr/bin/env node

/**
 * Environment setup script for DYOR Hub
 * Creates environment files from examples if they don't exist
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

// Check for Docker
function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if Docker daemon is running
function isDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Copy environment file if it doesn't exist
function setupEnvFile(sourceFilePath, targetFilePath) {
  if (!fs.existsSync(targetFilePath)) {
    if (fs.existsSync(sourceFilePath)) {
      fs.copyFileSync(sourceFilePath, targetFilePath);
      console.log(`${colors.green}✓${colors.reset} Created ${targetFilePath}`);
      return true;
    } else {
      console.log(`${colors.red}✗${colors.reset} Source file ${sourceFilePath} not found`);
      return false;
    }
  } else {
    console.log(`${colors.blue}ℹ${colors.reset} File ${targetFilePath} already exists`);
    return true;
  }
}

// Print boxed error message
function printError(title, message, solution) {
  const lines = [];
  const width =
    Math.max(
      title.length,
      ...message.split('\n').map((line) => line.length),
      ...solution.split('\n').map((line) => line.length),
    ) + 4;

  const line = '─'.repeat(width);

  lines.push(`${colors.red}┌${line}┐${colors.reset}`);
  lines.push(
    `${colors.red}│${colors.reset} ${colors.bold}${colors.red}${title}${colors.reset}${' '.repeat(width - title.length - 2)} ${colors.red}│${colors.reset}`,
  );
  lines.push(`${colors.red}├${line}┤${colors.reset}`);

  message.split('\n').forEach((messageLine) => {
    lines.push(
      `${colors.red}│${colors.reset} ${messageLine}${' '.repeat(width - messageLine.length - 2)} ${colors.red}│${colors.reset}`,
    );
  });

  lines.push(`${colors.red}├${line}┤${colors.reset}`);
  lines.push(
    `${colors.red}│${colors.reset} ${colors.bold}${colors.green}Solution:${colors.reset}${' '.repeat(width - 10)} ${colors.red}│${colors.reset}`,
  );

  solution.split('\n').forEach((solutionLine) => {
    lines.push(
      `${colors.red}│${colors.reset} ${solutionLine}${' '.repeat(width - solutionLine.length - 2)} ${colors.red}│${colors.reset}`,
    );
  });

  lines.push(`${colors.red}└${line}┘${colors.reset}`);

  console.log(lines.join('\n'));
}

// Main function
async function main() {
  // Check for Docker
  const hasDocker = checkDocker();
  if (!hasDocker) {
    printError(
      'Docker Not Installed',
      'Docker Desktop is required but was not found on your system.',
      'Install Docker Desktop from https://docs.docker.com/get-docker/\nThen run this setup script again.',
    );
    process.exit(1);
  }

  // Check if Docker is running
  const dockerRunning = isDockerRunning();
  if (!dockerRunning) {
    printError(
      'Docker Not Running',
      'Docker is installed but not currently running.',
      "Start Docker Desktop application and wait until it's fully loaded.\nThen run this setup script again.",
    );
    process.exit(1);
  }

  console.log(`${colors.green}✓${colors.reset} Docker is installed and running\n`);

  // Setup environment files
  console.log(`${colors.blue}Setting up environment files...${colors.reset}`);

  const apiEnvPath = path.join(__dirname, '../../apps/api/.env');
  const apiEnvExamplePath = path.join(__dirname, '../../apps/api/.env.example');
  const webEnvPath = path.join(__dirname, '../../apps/web/.env');
  const webEnvExamplePath = path.join(__dirname, '../../apps/web/.env.example');

  const apiSuccess = setupEnvFile(apiEnvExamplePath, apiEnvPath);
  const webSuccess = setupEnvFile(webEnvExamplePath, webEnvPath);

  if (!apiSuccess) {
    printError(
      'Missing API Environment Example',
      `Could not find ${apiEnvExamplePath}`,
      'Create a new file at apps/api/.env with the required environment variables.\nSee DEVELOPMENT.md for required variables.',
    );
    process.exit(1);
  }

  if (!webSuccess) {
    printError(
      'Missing Web Environment Example',
      `Could not find ${webEnvExamplePath}`,
      'Create a new file at apps/web/.env with the required environment variables.\nSee DEVELOPMENT.md for required variables.',
    );
    process.exit(1);
  }

  // Validate key environment variables
  try {
    const apiEnvContent = fs.readFileSync(apiEnvPath, 'utf8');

    if (!apiEnvContent.includes('POSTGRES_USER=') || !apiEnvContent.includes('POSTGRES_DB=')) {
      printError(
        'Missing Required Environment Variables',
        'The API environment file is missing required database variables.',
        'Open apps/api/.env and make sure it contains:\nPOSTGRES_USER=<username>\nPOSTGRES_DB=<dbname>\nPOSTGRES_PASSWORD=<password>',
      );
      process.exit(1);
    }
  } catch (error) {
    printError(
      'Environment File Error',
      `Error reading environment file: ${error.message}`,
      'Check file permissions and try again.',
    );
    process.exit(1);
  }

  console.log(`\n${colors.green}${colors.bold}Environment setup complete!${colors.reset}`);
}

main().catch((error) => {
  printError(
    'Unexpected Error',
    error.message,
    'Check the error message above and try again.\nIf the problem persists, please report it on GitHub.',
  );
  process.exit(1);
});
