import { RoleManager } from './src/roles/role_manager.js';

const settings = {
    "roleTemplatesDir": "./roles/templates",
    "generatedProfilesDir": "./profiles/generated",
    "minecraft_version": "1.20.4", // supports up to 1.21.1
    "host": "192.168.86.35", // or "localhost", "your.ip.address.here"
    "port": 55916,
    "auth": "offline", // or "microsoft"

    // the mindserver manages all agents and hosts the UI
    "host_mindserver": true, // if true, the mindserver will be hosted on this machine. otherwise, specify a public IP address
    "mindserver_host": "localhost",
    "mindserver_port": 8080,
    
    // the base profile is shared by all bots for default prompts/examples/modes
    "base_profile": "./profiles/defaults/survival.json", // also see creative.json, god_mode.json
    "roles": [
        "explorer",
        "builder",
        "farmer",
        "hunter",
        "leader",
        "engineer",
        "merchant",
        "scholar",
        "healer",
        "scout"
    ],
    // using more than 1 profile requires you to /msg each bot indivually
    // individual profiles override values from the base profile
    "profiles": [
        "./profiles/explorer.json",
        "./profiles/builder.json",
        "./profiles/farmer.json",
        "./profiles/hunter.json",
        "./profiles/leader.json",
        "./profiles/engineer.json",
        "./profiles/merchant.json",
        "./profiles/scholar.json",
        "./profiles/healer.json",
        "./profiles/scout.json"
    ], // This will be populated with generated profiles
    "load_memory": false, // load memory from previous session
    "init_message": "Respond with hello world and your name", // sends to all on spawn
    "only_chat_with": [], // users that the bots listen to and send general messages to. if empty it will chat publicly
    "speak": false, // allows all bots to speak through system text-to-speech. works on windows, mac, on linux you need to `apt install espeak`
    "language": "en", // translate to/from this language. Supports these language names: https://cloud.google.com/translate/docs/languages
    "show_bot_views": false, // show bot's view in browser at localhost:3000, 3001...

    "allow_insecure_coding": true, // allows newAction command and model can write/run code on your computer. enable at own risk
    "allow_vision": true, // allows vision model to interpret screenshots as inputs
    "blocked_actions" : ["!checkBlueprint", "!checkBlueprintLevel", "!getBlueprint", "!getBlueprintLevel"] , // commands to disable and remove from docs. Ex: ["!setMode"]
    "code_timeout_mins": -1, // minutes code is allowed to run. -1 for no timeout
    "relevant_docs_count": 5, // number of relevant code function docs to select for prompting. -1 for all

    "max_messages": 15, // max number of messages to keep in context
    "num_examples": 2, // number of examples to give to the model
    "max_commands": -1, // max number of commands that can be used in consecutive responses. -1 for no limit
    "verbose_commands": true, // show full command syntax
    "narrate_behavior": true, // chat simple automatic actions ('Picking up item!')
    "chat_bot_messages": true, // publicly chat messages to other bots
    "log_all_prompts": false, // log ALL prompts to file
    
    // Ollama LLM settings
    "ollama_host": "192.168.86.35", // defaults to same as minecraft host
    "ollama_port": 11434, // default Ollama port
    "ollama_model": "llama3.1",
    "ollama_model_aliases": { "llama3.1": "meta-llama-3.1-8b-instruct" }
}

// these environment variables override certain settings
if (process.env.MINECRAFT_PORT) {
    settings.port = process.env.MINECRAFT_PORT;
}
if (process.env.MINDSERVER_PORT) {
    settings.mindserver_port = process.env.MINDSERVER_PORT;
}
if (process.env.PROFILES && JSON.parse(process.env.PROFILES).length > 0) {
    settings.profiles = JSON.parse(process.env.PROFILES);
}
if (process.env.INSECURE_CODING) {
    settings.allow_insecure_coding = true;
}
if (process.env.BLOCKED_ACTIONS) {
    settings.blocked_actions = JSON.parse(process.env.BLOCKED_ACTIONS);
}
if (process.env.MAX_MESSAGES) {
    settings.max_messages = process.env.MAX_MESSAGES;
}
if (process.env.NUM_EXAMPLES) {
    settings.num_examples = process.env.NUM_EXAMPLES;
}
if (process.env.LOG_ALL) {
    settings.log_all_prompts = process.env.LOG_ALL;
}
if (process.env.OLLAMA_HOST) {
    settings.ollama_host = process.env.OLLAMA_HOST;
}
if (process.env.OLLAMA_PORT) {
    settings.ollama_port = process.env.OLLAMA_PORT;
}
if (process.env.OLLAMA_MODEL) {
    settings.ollama_model = process.env.OLLAMA_MODEL;
}

// Generate roles and update profiles
const roleManager = new RoleManager(settings.roleTemplatesDir, settings.generatedProfilesDir);
roleManager.generateRoles(settings.roles);
settings.profiles = roleManager.getGeneratedProfilePaths();

export default settings;
