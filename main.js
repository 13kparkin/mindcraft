// Register global error handlers to prevent agent crashes
process.on('unhandledRejection', err => console.error('Unhandled Rejection:', err));
process.on('uncaughtException', err => console.error('Uncaught Exception:', err));

import { AgentProcess } from './src/process/agent_process.js';
import settings from './settings.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createMindServer } from './src/server/mind_server.js';
import { mainProxy } from './src/process/main_proxy.js';
import { readFileSync } from 'fs';
import { RoleManager } from './src/roles/role_manager.js';
import BotFactory from './src/bots/bot_factory.js';
import { Local } from './src/models/local.js';

function parseArguments() {
    return yargs(hideBin(process.argv))
        .option('profiles', {
            type: 'array',
            describe: 'List of agent profile paths',
        })
        .option('task_path', {
            type: 'string',
            describe: 'Path to task file to execute'
        })
        .option('task_id', {
            type: 'string',
            describe: 'Task ID to execute'
        })
        .help()
        .alias('help', 'h')
        .parse();
}

function getProfiles(args) {
    return args.profiles || settings.profiles;
}

/**
 * Checks if Ollama is running and the required model is available
 * @returns {Promise<boolean>} True if Ollama is healthy, false otherwise
 */
async function checkOllamaHealth() {
    try {
        // Get the model alias from settings and map it to the actual model name
        const alias = settings.ollama_model;
        const modelName = settings.ollama_model_aliases[alias] || alias;
        const local = new Local(modelName);
        
        console.log(`Checking Ollama health at ${local.url}...`);
        const healthStatus = await local.checkOllamaHealth();
        
        if (!healthStatus.available) {
            console.error(`\n❌ ERROR: ${healthStatus.error}`);
            console.error(`\nPlease ensure Ollama is running and accessible at ${local.url}`);
            console.error(`Installation instructions: https://ollama.com/download\n`);
            return false;
        }
        
        if (healthStatus.error) {
            console.error(`\n⚠️ WARNING: ${healthStatus.error}`);
            console.error(`\nAvailable models: ${healthStatus.models.join(', ')}`);
            console.error(`To install the required model, run: ollama pull ${modelName}\n`);
            return false;
        }
        
        console.log(`✅ Ollama is running and model '${modelName}' is available.`);
        return true;
    } catch (error) {
        console.error(`\n❌ ERROR: Failed to check Ollama health: ${error.message}`);
        console.error(`\nPlease ensure Ollama is installed and running.`);
        console.error(`Installation instructions: https://ollama.com/download\n`);
        return false;
    }
}

async function main() {
    // Initialize the role manager and generate roles
    const roleManager = new RoleManager(settings.roleTemplatesDir, settings.generatedProfilesDir);
    roleManager.generateRoles(settings.roles);
    
    if (settings.host_mindserver) {
        const mindServer = createMindServer(settings.mindserver_port);
    }
    mainProxy.connect();

    const args = parseArguments();
    args.task_path = args.task_path || './tasks/civilization_task.json';
    args.task_id   = args.task_id   || 'civilization_building';
    const profiles = roleManager.getGeneratedProfilePaths();
    console.log(profiles);
    const { load_memory, init_message } = settings;

    // Check Ollama health before instantiating any bots
    const ollamaHealthy = await checkOllamaHealth();
    if (!ollamaHealthy) {
        console.error('Exiting due to Ollama health check failure.');
        process.exit(1);
    }

    for (let i=0; i<profiles.length; i++) {
        BotFactory.createBot(profiles[i], {
            loadMemory: load_memory,
            initMessage: init_message,
            taskPath: args.task_path,
            taskId: args.task_id
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
