/**
 * @fileoverview Cloudflare WAF Settings Service Tests
 * @description Unit tests for the Cloudflare WAF settings service
 */

import { 
  updateScrapeShieldSettings, 
  updateBotFightModeSettings, 
  getZoneIdByName,
  updateTIsuyeeComWAFSettings
} from './waf-settings';

// Mock the fetch API for testing
global.fetch = jest.fn();

describe('Cloudflare WAF Settings Service', () => {
  const mockApiToken = 'test-api-token';
  const mockZoneId = 'test-zone-id';
  const mockZoneName = 't.isuyee.com';

  beforeEach(() => {
    fetch.mockClear();
  });

  describe('getZoneIdByName', () => {
    it('should return zone ID for valid zone name', async () => {
      const mockResponse = {
        success: true,
        result: [{ id: mockZoneId, name: mockZoneName, status: 'active' }]
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const zoneId = await getZoneIdByName(mockZoneName, mockApiToken);
      expect(zoneId).toBe(mockZoneId);
      
      expect(fetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/zones?name=${mockZoneName}&status=active`,
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockApiToken}`,
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should throw error for invalid zone name', async () => {
      const mockResponse = {
        success: true,
        result: []
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(getZoneIdByName('invalid.com', mockApiToken))
        .rejects
        .toThrow('Zone not found: invalid.com');
    });

    it('should throw error for API failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, errors: [{ message: 'API Error' }] })
      });

      await expect(getZoneIdByName(mockZoneName, mockApiToken))
        .rejects
        .toThrow('Cloudflare API error');
    });
  });

  describe('updateScrapeShieldSettings', () => {
    it('should update scrape shield settings successfully', async () => {
      const mockSettings = { block_ai_automated_programs: false };
      const mockResponse = {
        success: true,
        result: mockSettings
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await updateScrapeShieldSettings(mockZoneId, mockApiToken, mockSettings);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(mockSettings);
      
      expect(fetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/zones/${mockZoneId}/settings/scrape_shield`,
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${mockApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mockSettings)
        })
      );
    });

    it('should throw error for API failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, errors: [{ message: 'API Error' }] })
      });

      await expect(updateScrapeShieldSettings(mockZoneId, mockApiToken, {}))
        .rejects
        .toThrow('Cloudflare API error');
    });
  });

  describe('updateBotFightModeSettings', () => {
    it('should update bot fight mode settings successfully', async () => {
      const mockSettings = { ai_labyrinth_enabled: false, enabled: true };
      const mockResponse = {
        success: true,
        result: mockSettings
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await updateBotFightModeSettings(mockZoneId, mockApiToken, mockSettings);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(mockSettings);
      
      expect(fetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/zones/${mockZoneId}/settings/bot_fight_mode`,
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${mockApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mockSettings)
        })
      );
    });
  });

  describe('updateTIsuyeeComWAFSettings', () => {
    it('should update WAF settings for t.isuyee.com successfully', async () => {
      // Mock zone ID lookup
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: [{ id: mockZoneId, name: mockZoneName, status: 'active' }]
        })
      });
      
      // Mock scrape shield settings update
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: { block_ai_automated_programs: false }
        })
      });
      
      // Mock bot fight mode settings update
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: { ai_labyrinth_enabled: false, enabled: true }
        })
      });

      await expect(updateTIsuyeeComWAFSettings(mockApiToken))
        .resolves
        .toBeUndefined();

      // Should have made 3 API calls: get zone ID, update scrape shield, update bot fight mode
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error when API token is missing', async () => {
      await expect(updateTIsuyeeComWAFSettings(''))
        .rejects
        .toThrow('Cloudflare API token is required');
      
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});