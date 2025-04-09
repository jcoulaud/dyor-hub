#!/usr/bin/env node

/**
 * Certificate check script for DYOR Hub
 * Checks for mkcert-generated certificates and guides the user to create them if missing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Print boxed info message
function printInfoBox(title, message) {
  const lines = [];
  const messageLines = message.split('\n');
  const width = Math.max(title.length, ...messageLines.map((line) => line.length)) + 4;
  const line = '─'.repeat(width);

  lines.push(`${colors.blue}┌${line}┐${colors.reset}`);
  lines.push(
    `${colors.blue}│${colors.reset} ${colors.bold}${title}${colors.reset}${' '.repeat(width - title.length - 2)} ${colors.blue}│${colors.reset}`,
  );
  lines.push(`${colors.blue}├${line}┤${colors.reset}`);

  messageLines.forEach((messageLine) => {
    lines.push(
      `${colors.blue}│${colors.reset} ${messageLine}${' '.repeat(width - messageLine.length - 2)} ${colors.blue}│${colors.reset}`,
    );
  });

  lines.push(`${colors.blue}└${line}┘${colors.reset}`);
  console.log(lines.join('\n'));
}

// Check if mkcert is installed
function isMkcertInstalled() {
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Get platform-specific installation instructions
function getMkcertInstallInstructions() {
  const platform = process.platform;

  if (platform === 'darwin') {
    return 'brew install mkcert';
  } else if (platform === 'linux') {
    return 'Follow instructions at https://github.com/FiloSottile/mkcert#linux';
  } else if (platform === 'win32') {
    return 'choco install mkcert\n   or\nscoop install mkcert';
  } else {
    return 'Visit https://github.com/FiloSottile/mkcert for installation instructions';
  }
}

// Check for certificates and guide setup if needed
async function main() {
  const secretsDir = path.join(__dirname, '../../secrets');
  const certPath = path.join(secretsDir, 'localhost+2.pem');
  const keyPath = path.join(secretsDir, 'localhost+2-key.pem');

  // Check if certificates exist
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log(`${colors.green}✓${colors.reset} HTTPS certificates already exist`);
    return true;
  }

  console.log(`${colors.yellow}!${colors.reset} HTTPS certificates not found`);

  // Ensure secrets directory exists
  if (!fs.existsSync(secretsDir)) {
    fs.mkdirSync(secretsDir, { recursive: true });
    console.log(`${colors.green}✓${colors.reset} Created secrets directory`);
  }

  // Check if mkcert is installed
  const hasMkcert = isMkcertInstalled();

  if (!hasMkcert) {
    const installCmd = getMkcertInstallInstructions();

    printInfoBox(
      'HTTPS Certificate Setup Required',
      `To use the development environment with HTTPS, you need to install mkcert and generate certificates.\n\n` +
        `Install mkcert with:\n` +
        `   ${installCmd}\n\n` +
        `Then run:\n` +
        `   mkcert -install\n` +
        `   cd ${path.relative(process.cwd(), secretsDir) || 'secrets'}\n` +
        `   mkcert localhost 127.0.0.1 ::1\n\n` +
        `After completing these steps, run the setup script again.`,
    );

    return false;
  } else {
    // mkcert is installed but certificates don't exist yet
    printInfoBox(
      'HTTPS Certificate Setup Required',
      `To use the development environment with HTTPS, you need to generate certificates.\n\n` +
        `Run these commands:\n` +
        `   mkcert -install\n` +
        `   cd ${path.relative(process.cwd(), secretsDir) || 'secrets'}\n` +
        `   mkcert localhost 127.0.0.1 ::1\n\n` +
        `After completing these steps, run the setup script again.`,
    );

    return false;
  }
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error(
      `\n${colors.red}${colors.bold}Certificate check failed:${colors.reset} ${error.message}`,
    );
    process.exit(1);
  });
} else {
  // Export the main function when required by another module
  module.exports = main;
}
