/**
 * Bot Factory for creating and managing bot instances
 * 
 * This module provides a factory for creating bot instances from profile paths,
 * handling the creation of AgentProcess instances, registration with mainProxy,
 * and bot startup in a centralized way.
 */

import { AgentProcess } from '../process/agent_process.js';
import { mainProxy } from '../process/main_proxy.js';
import { readFileSync } from 'fs';

class BotFactory {
  /**
   * Creates a bot instance or multiple instances from a profile
   * 
   * @param {string} profilePath - Path to the bot profile JSON file
   * @param {Object} options - Optional configuration
   * @param {number} options.count - Number of instances to create (default: 1)
   * @param {boolean} options.loadMemory - Whether to load memory (default: true)
   * @param {string} options.initMessage - Initial message to send to the bot
   * @param {string} options.namePrefix - Prefix to add to cloned bot names
   * @param {string} options.nameSuffix - Suffix to add to cloned bot names
   * @param {string} options.taskPath - Path to task file to execute
   * @param {string} options.taskId - Task ID to execute
   * @returns {Array} - Array of created agent processes
   */
  static createBot(profilePath, options = {}) {
    const {
      count = 1,
      loadMemory = true,
      initMessage = null,
      namePrefix = '',
      nameSuffix = '',
      taskPath = null,
      taskId = null
    } = options;
    
    // Minimally read the profile just to extract the agent name
    const baseAgentJson = JSON.parse(readFileSync(profilePath, 'utf8'));
    
    const createdAgents = [];
    
    // Create the specified number of instances
    for (let i = 0; i < count; i++) {
      const agent_process = new AgentProcess();
      
      // Determine the agent name
      let agentName;
      if (count > 1) {
        agentName = `${namePrefix}${baseAgentJson.name}${nameSuffix}${i > 0 ? `-${i}` : ''}`;
      } else {
        agentName = `${namePrefix}${baseAgentJson.name}${nameSuffix}`;
      }
      
      // Register the agent with the main proxy
      mainProxy.registerAgent(agentName, agent_process);
      
      // Start the agent process with the profile path directly
      agent_process.start(
        profilePath,
        loadMemory,
        initMessage,
        createdAgents.length, // Use as index
        taskPath,
        taskId
      );
      
      createdAgents.push(agent_process);
      
      // Add a small delay between starting agents to avoid race conditions
      if (i < count - 1) {
        // This is a synchronous delay, in real implementation you might want to make this async
        const startTime = Date.now();
        while (Date.now() - startTime < 1000) {
          // Wait for 1 second
        }
      }
    }
    
    return createdAgents;
  }
}

export default BotFactory;
