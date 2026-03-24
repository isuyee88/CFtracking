/**
 * @fileexample Example usage of Cloudflare WAF settings service
 * @description Demonstrates how to use the Cloudflare WAF settings service to update Bot Fight Mode and Scrape Shield settings
 */

import { updateTIsuyeeComWAFSettings } from './waf-settings';

// Example 1: Using environment variable (recommended for production)
// Make sure CF_API_TOKEN is set in your Windows user environment variables
// updateTIsuyeeComWAFSettings()
//   .then(() => console.log('Settings updated successfully'))
//   .catch(error => {
//     console.error('Failed to update settings:', error);
//     process.exit(1);
//   });

// Example 2: Passing API token directly (useful for testing or scripts)
/*
import { updateTIsuyeeComWAFSettings } from './waf-settings';

// Direct token passing
updateTIsuyeeComWAFSettings('your-cloudflare-api-token-here')
  .then(() => console.log('Settings updated successfully'))
  .catch(error => {
    console.error('Failed to update settings:', error);
    process.exit(1);
  });
*/

// Example 3: Using individual functions for more control
/*
import { 
  getZoneIdByName, 
  updateScrapeShieldSettings, 
  updateBotFightModeSettings 
} from './waf-settings';

async function updateSettings() {
  // Get token from environment variable
  const apiToken = process.env.CF_API_TOKEN;
  if (!apiToken) {
    throw new Error('CF_API_TOKEN environment variable not set');
  }
  
  const zoneName = 't.isuyee.com';
  
  try {
    // Get zone ID
    const zoneId = await getZoneIdByName(zoneName, apiToken);
    console.log(`Zone ID for ${zoneName}: ${zoneId}`);
    
    // Update Scrape Shield settings
    await updateScrapeShieldSettings(zoneId, apiToken, {
      block_ai_automated_programs: false
      // Add other settings as needed
    });
    console.log('Scrape Shield settings updated');
    
    // Update Bot Fight Mode settings
    await updateBotFightModeSettings(zoneId, apiToken, {
      ai_labyrinth_enabled: false,
      enabled: true // Keep general bot protection
    });
    console.log('Bot Fight Mode settings updated');
    
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

// updateSettings();
*/

export { updateTIsuyeeComWAFSettings };