#!/usr/bin/env node

/**
 * Setup script for Claude Desktop configuration
 * Adds fossflow-mcp to the Claude Desktop config file
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getConfigPath() {
  const home = homedir();
  const platform = process.platform;

  if (platform === 'darwin') {
    return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'win32') {
    return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
  } else {
    return join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }
}

function getMcpServerPath() {
  // Get the dist/index.js path relative to this script
  return join(__dirname, '..', 'dist', 'index.js');
}

function main() {
  const configPath = getConfigPath();
  const mcpServerPath = getMcpServerPath();

  console.log('🔧 FossFLOW MCP Setup for Claude Desktop\n');
  console.log(`Config file: ${configPath}`);
  console.log(`MCP server:  ${mcpServerPath}\n`);

  // Check if MCP server is built
  if (!existsSync(mcpServerPath)) {
    console.error('❌ MCP server not built. Please run:');
    console.error('   npm run build');
    process.exit(1);
  }

  let config = { mcpServers: {} };

  // Load existing config if it exists
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      config = JSON.parse(content);
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      console.log('✓ Found existing config');
    } catch (err) {
      console.log('⚠ Could not parse existing config, creating new one');
    }
  } else {
    // Create directory if it doesn't exist
    const configDir = dirname(configPath);
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
      console.log(`✓ Created config directory: ${configDir}`);
    }
  }

  // Check if fossflow already configured
  if (config.mcpServers.fossflow) {
    console.log('\n⚠ fossflow-mcp already configured');
    console.log('  Current config:');
    console.log(`    command: ${config.mcpServers.fossflow.command}`);
    console.log(`    args: ${JSON.stringify(config.mcpServers.fossflow.args)}`);

    const currentPath = config.mcpServers.fossflow.args?.[0];
    if (currentPath === mcpServerPath) {
      console.log('\n✓ Configuration is up to date');
      return;
    }

    console.log('\n  Updating to new path...');
  }

  // Add/update fossflow config
  config.mcpServers.fossflow = {
    command: 'node',
    args: [mcpServerPath]
  };

  // Write config
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('\n✅ Configuration updated successfully!\n');
    console.log('Next steps:');
    console.log('  1. Restart Claude Desktop');
    console.log('  2. Start a new conversation');
    console.log('  3. Try: "Create an architecture diagram with 3 servers"\n');
  } catch (err) {
    console.error(`\n❌ Failed to write config: ${err.message}`);
    console.error('\nManual configuration:');
    console.error(`Add the following to ${configPath}:\n`);
    console.error(JSON.stringify({
      mcpServers: {
        fossflow: {
          command: 'node',
          args: [mcpServerPath]
        }
      }
    }, null, 2));
    process.exit(1);
  }
}

main();
