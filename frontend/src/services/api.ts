/**
 * @fileoverview API 服务
 * @description 统一封装后端 API 调用
 * @module services/api
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// 获取 Campaign 列表
export async function fetchCampaigns() {
  const response = await fetch(`${API_BASE_URL}/api/campaigns`);
  if (!response.ok) {
    throw new Error('Failed to fetch campaigns');
  }
  return response.json();
}

// 获取单个 Campaign
export async function fetchCampaign(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch campaign');
  }
  return response.json();
}

// 创建 Campaign
export async function createCampaign(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create campaign');
  }
  return response.json();
}

// 更新 Campaign
export async function updateCampaign(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update campaign');
  }
  return response.json();
}

// 删除 Campaign
export async function deleteCampaign(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete campaign');
  }
  return response.json();
}

// 获取 Campaign 统计
export async function fetchCampaignStats(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch campaign stats');
  }
  return response.json();
}

// 获取 Tracking Script 代码
export async function fetchTrackingScript(campaignId: string, type: 'tracking' | 'kclient' = 'tracking') {
  const response = await fetch(`${API_BASE_URL}/api/tracking/script/code?campaignId=${campaignId}&type=${type}`);
  if (!response.ok) {
    throw new Error('Failed to fetch tracking script');
  }
  return response.json();
}

// ==================== Offers API ====================

export async function fetchOffers(withStats = true) {
  const response = await fetch(`${API_BASE_URL}/api/offers?withStats=${withStats}`);
  if (!response.ok) {
    throw new Error('Failed to fetch offers');
  }
  return response.json();
}

export async function fetchOffer(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch offer');
  }
  return response.json();
}

export async function createOffer(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create offer');
  }
  return response.json();
}

export async function updateOffer(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update offer');
  }
  return response.json();
}

export async function deleteOffer(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete offer');
  }
  return response.json();
}

// ==================== Traffic Sources API ====================

export async function fetchTrafficSources(withStats = true) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources?withStats=${withStats}`);
  if (!response.ok) {
    throw new Error('Failed to fetch traffic sources');
  }
  return response.json();
}

export async function fetchTrafficSource(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch traffic source');
  }
  return response.json();
}

export async function createTrafficSource(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create traffic source');
  }
  return response.json();
}

export async function updateTrafficSource(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update traffic source');
  }
  return response.json();
}

export async function deleteTrafficSource(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete traffic source');
  }
  return response.json();
}

export async function testTrafficSourceConnection(data: {
  apiBaseUrl: string;
  apiKey: string;
  apiSecret?: string;
  platformType?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/traffic-sources/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// ==================== Affiliate Networks API ====================

export async function fetchAffiliateNetworks(withStats = true) {
  const response = await fetch(`${API_BASE_URL}/api/affiliate-networks?withStats=${withStats}`);
  if (!response.ok) {
    throw new Error('Failed to fetch affiliate networks');
  }
  return response.json();
}

export async function fetchAffiliateNetwork(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/affiliate-networks/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch affiliate network');
  }
  return response.json();
}

export async function createAffiliateNetwork(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/affiliate-networks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create affiliate network');
  }
  return response.json();
}

export async function updateAffiliateNetwork(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/affiliate-networks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update affiliate network');
  }
  return response.json();
}

export async function deleteAffiliateNetwork(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/affiliate-networks/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete affiliate network');
  }
  return response.json();
}

// ==================== Landings API ====================

export async function fetchLandings(withStats = true) {
  const response = await fetch(`${API_BASE_URL}/api/landings?withStats=${withStats}`);
  if (!response.ok) {
    throw new Error('Failed to fetch landings');
  }
  return response.json();
}

export async function fetchLanding(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/landings/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch landing');
  }
  return response.json();
}

export async function createLanding(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/landings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create landing');
  }
  return response.json();
}

export async function updateLanding(id: string | number, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/landings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update landing');
  }
  return response.json();
}

export async function deleteLanding(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/api/landings/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete landing');
  }
  return response.json();
}
