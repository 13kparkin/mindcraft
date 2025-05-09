import { executeCommand } from './commands/index.js';
import settings from '../../settings.js';

export async function scanEnvironment(agent) {
  console.log('scanEnvironment called with radius:', settings.scan_radius);
  
  // Validate scan radius
  if (typeof settings.scan_radius !== 'number' || isNaN(settings.scan_radius)) {
    console.warn('Invalid scan_radius in settings. Skipping environment scan.');
    return null;
  }

  try {
    // Execute the scan environment command
    const result = await executeCommand(agent, `!scanEnvironment(${settings.scan_radius})`);
    console.log('scanEnvironment raw result:', result);

    // Return trimmed output if it's a string
    if (typeof result === 'string') {
      return result.trim();
    }
    return result;
  } catch (error) {
    console.error('Error during environment scan:', error);
    return null;
  }
}
