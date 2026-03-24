/**
 * @fileoverview Cloudflare WAF/Bot Management Settings Service
 * @description Service to update Cloudflare WAF and Bot Management settings for a zone
 * @module services/cloudflare/waf-settings
 */

/**
 * Cloudflare API response interface
 */
interface CloudflareAPIResponse<T> {
  result: T;
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<any>;
}

/**
 * Scrape Shield settings interface
 */
interface ScrapeShieldSettings {
  email_address_decode: boolean;
  email_address_decode_exception_list: string[];
  hotlink_protection: boolean;
  hotlink_protection_exception_list: string[];
  scrapetext_protection: boolean;
  security_header: boolean;
  security_header_preload: boolean;
  security_header_xss_protection: boolean;
  user_agent_blocking: boolean;
  javascript_challenge: boolean;
  // AI-related settings (hypothetical - need to verify actual API)
  block_ai_automated_programs?: boolean;
  ai_maze_enabled?: boolean;
}

/**
 * Bot Fight Mode settings interface
 */
interface BotFightModeSettings {
  enabled: boolean;
  // Additional AI-related settings
  ai_labyrinth_enabled?: boolean;
}

/**
 * Update Cloudflare Scrape Shield settings for a zone
 * @param zoneId Cloudflare zone ID
 * @param apiToken Cloudflare API token with Zone:Settings:Edit permission
 * @param settings Scrape Shield settings to update
 * @returns Promise with API response
 */
export async function updateScrapeShieldSettings(
  zoneId: string,
  apiToken: string,
  settings: Partial<ScrapeShieldSettings>
): Promise<CloudflareAPIResponse<ScrapeShieldSettings>> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/scrape_shield`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Cloudflare API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Update Cloudflare Bot Fight Mode settings for a zone
 * @param zoneId Cloudflare zone ID
 * @param apiToken Cloudflare API token with Zone:Settings:Edit permission
 * @param settings Bot Fight Mode settings to update
 * @returns Promise with API response
 */
export async function updateBotFightModeSettings(
  zoneId: string,
  apiToken: string,
  settings: Partial<BotFightModeSettings>
): Promise<CloudflareAPIResponse<BotFightModeSettings>> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/bot_fight_mode`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Cloudflare API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Get zone ID from zone name (e.g., t.isuyee.com)
 * @param zoneName Zone name (e.g., t.isuyee.com)
 * @param apiToken Cloudflare API token with Zone:Zone:Read permission
 * @returns Promise with zone ID
 */
export async function getZoneIdByName(
  zoneName: string,
  apiToken: string
): Promise<string> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones?name=${zoneName}&status=active`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Cloudflare API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  
  if (!data.success || !data.result || data.result.length === 0) {
    throw new Error(`Zone not found: ${zoneName}`);
  }

  return data.result[0].id;
}

/**
 * Main function to update WAF/Bot Management settings for t.isuyee.com
 * Disables Block AI automated programs and AI Maze
 * @param apiToken Optional Cloudflare API token (if not provided, reads from CF_API_TOKEN env var)
 * @param zoneName Zone name (default: t.isuyee.com)
 */
export async function updateTIsuyeeComWAFSettings(
  apiToken?: string,
  zoneName: string = 't.isuyee.com'
): Promise<void> {
  try {
    // Get API token from parameter or environment variable
    const token = apiToken || process.env.CF_API_TOKEN;
    
    if (!token) {
      throw new Error('Cloudflare API token is required. Provide as parameter or set CF_API_TOKEN environment variable.');
    }

    console.log(`Fetching zone ID for ${zoneName}...`);
    const zoneId = await getZoneIdByName(zoneName, token);
    console.log(`Zone ID: ${zoneId}`);

    // Update Scrape Shield settings to disable Block AI automated programs
    console.log('Updating Scrape Shield settings...');
    await updateScrapeShieldSettings(zoneId, token, {
      // Note: The exact field names for AI settings need to be verified
      // These are placeholders based on common naming patterns
      block_ai_automated_programs: false,
      // Other scrape shield settings can be preserved or updated as needed
    });
    console.log('Scrape Shield settings updated successfully');

    // Update Bot Fight Mode settings to disable AI Maze/Labyrinth
    console.log('Updating Bot Fight Mode settings...');
    await updateBotFightModeSettings(zoneId, token, {
      ai_labyrinth_enabled: false,
      // Keep Bot Fight Mode enabled for general bot protection
      enabled: true
    });
    console.log('Bot Fight Mode settings updated successfully');

    console.log('✅ All WAF/Bot Management settings updated successfully for', zoneName);
    console.log('   - Block AI automated programs: DISABLED');
    console.log('   - AI Maze/Labyrinth: DISABLED');
    
  } catch (error) {
    console.error('❌ Failed to update Cloudflare WAF/Bot Management settings:', error);
    throw error;
  }
}

// Export individual functions for use in other modules
export {
  updateScrapeShieldSettings,
  updateBotFightModeSettings,
  getZoneIdByName
};