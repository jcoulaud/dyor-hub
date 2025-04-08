#!/usr/bin/env node

/**
 * Docker startup script with enhanced error handling
 */

const { spawn } = require('child_process');
const path = require('path');

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

// Print startup info
function printStartupInfo() {
  console.log(`${colors.blue}Services being started:${colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} PostgreSQL (port 5433)`);
  console.log(`  ${colors.cyan}•${colors.reset} Redis (port 6380)`);
  console.log(`  ${colors.cyan}•${colors.reset} NestJS API (port 3101)`);
  console.log(`  ${colors.cyan}•${colors.reset} Next.js Web (port 3100)`);

  console.log(`\n${colors.yellow}Starting containers...${colors.reset}`);
  console.log(
    `${colors.yellow}This may take a moment for the first run as containers are built.${colors.reset}\n`,
  );
}

// Main function to run docker-compose
async function main() {
  printStartupInfo();

  const dockerComposePath = path.join(__dirname, 'docker-compose.yml');

  const dockerProcess = spawn('docker', ['compose', '-f', dockerComposePath, 'up'], {
    stdio: 'inherit',
  });

  // Handle process exit
  dockerProcess.on('error', (error) => {
    if (error.code === 'ENOENT') {
      printError(
        'Docker Command Not Found',
        'The docker command was not found in your PATH.',
        'Make sure Docker Desktop is installed and in your PATH.\nRestart your terminal and try again.',
      );
    } else {
      printError(
        'Docker Error',
        `An error occurred while starting Docker: ${error.message}`,
        'Check that Docker Desktop is running and try again.',
      );
    }
    process.exit(1);
  });

  // Handle specific exit codes
  dockerProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      if (code === 127) {
        printError(
          'Docker Command Not Found',
          'The docker command was not found in your PATH.',
          'Make sure Docker Desktop is installed and in your PATH.\nRestart your terminal and try again.',
        );
      } else if (code === 1) {
        printError(
          'Docker Compose Error',
          'An error occurred while starting the containers.',
          'Check that:\n1. Docker Desktop is running\n2. The ports (3100, 3101, 5433, 6380) are available\n3. Your .env files contain the required variables',
        );
      } else {
        printError(
          'Docker Compose Failed',
          `Docker Compose exited with code ${code}`,
          'Check the error messages above for more details.',
        );
      }
      process.exit(code);
    }
  });

  // Handle termination signals to gracefully stop docker-compose
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Stopping containers gracefully, please wait...${colors.reset}`);
    dockerProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log(`\n${colors.yellow}Stopping containers gracefully, please wait...${colors.reset}`);
    dockerProcess.kill('SIGTERM');
  });
}

main().catch((error) => {
  printError(
    'Unexpected Error',
    error.message,
    'Check the error message above and try again.\nIf the problem persists, please report it on GitHub.',
  );
  process.exit(1);
});
