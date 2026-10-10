#!/usr/bin/env python3
"""
CF-Tracking Offer 同步脚本
从 MyLead 和 Impact 同步已批准的 offers 到 CF-Tracking 平台
"""

import os
import sys
import json
import time
import requests
import winreg
from datetime import datetime
from typing import List, Dict, Optional

# =============================================================================
# 配置
# =============================================================================

CF_TRACKING_API = "https://cf-tracking-v2.suyee88.workers.dev/api"
AFFILIATE_OPS_HOME = os.environ.get('AFFILIATE_OPS_HOME', 
                                   r'C:\Users\isuye\Documents\richang\affiliate-ops')

# Impact API
IMPACT_API_BASE = "https://api.impact.com"
IMPACT_API_VERSION = "14"  # 必须设置，否则会报错

# MyLead API  
MYLEAD_API_BASE = "https://api.mylead.global/api/external/v1"

# =============================================================================
# 凭据管理
# =============================================================================

def get_impact_credentials() -> Optional[Dict[str, str]]:
    """从 Windows 注册表读取 Impact 凭据（名字含空格）"""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment", 0, winreg.KEY_READ)
        i = 0
        creds = {}
        while True:
            try:
                name, value, _ = winreg.EnumValue(key, i)
                if 'IMPACT' in name.upper():
                    if 'SID' in name.upper():
                        creds['sid'] = value
                    elif 'TOKEN' in name.upper() or 'AUTH' in name.upper():
                        creds['token'] = value
                i += 1
            except WindowsError:
                break
        winreg.CloseKey(key)
        
        if 'sid' in creds and 'token' in creds:
            return creds
        return None
    except Exception as e:
        print(f"⚠️  读取 Impact 凭据失败: {e}")
        return None

def get_mylead_token() -> Optional[str]:
    """获取 MyLead API token（通过登录或环境变量）"""
    # 优先使用已有的 token
    token = os.environ.get('MYLEAD_API_TOKEN')
    if token:
        return token
    
    # 否则尝试登录获取 token
    username = os.environ.get('MYLEAD_USERNAME')
    password = os.environ.get('MYLEAD_PASSWORD')
    
    if not username or not password:
        print("⚠️  MyLead 凭据未配置")
        return None
    
    try:
        print("🔐 正在登录 MyLead...")
        response = requests.post(
            f"{MYLEAD_API_BASE}/auth/login",
            data={
                'username': username,
                'password': password
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                token = data['data']['access_token']
                print("✅ MyLead 登录成功")
                return token
        
        print(f"❌ MyLead 登录失败: {response.status_code}")
        return None
    except Exception as e:
        print(f"❌ MyLead 登录错误: {e}")
        return None

# =============================================================================
# Impact API
# =============================================================================

def fetch_impact_campaigns(sid: str, token: str, max_campaigns: int = 20) -> List[Dict]:
    """获取 Impact 已批准的 campaigns"""
    print(f"\n📥 正在从 Impact 获取 campaigns (最多 {max_campaigns} 个)...")
    print(f"   API Base: {IMPACT_API_BASE}")
    print(f"   SID 长度: {len(sid)} 字符")
    
    url = f"{IMPACT_API_BASE}/Mediapartners/{sid}/Campaigns"
    
    campaigns = []
    page = 1
    
    while len(campaigns) < max_campaigns:
        try:
            print(f"   正在请求第 {page} 页...", flush=True)
            response = requests.get(
                url,
                auth=(sid, token),
                headers={
                    'IR-Version': IMPACT_API_VERSION,
                    'Accept': 'application/json'
                },
                params={
                    'Page': page,
                    'PageSize': min(100, max_campaigns - len(campaigns)),
                    'InsertionOrderStatus': 'Active'  # 只要已批准的
                },
                timeout=15  # 减少超时时间
            )
            
            print(f"   响应状态: {response.status_code}", flush=True)
            
            if response.status_code != 200:
                print(f"❌ Impact API 错误: {response.status_code}")
                print(f"   响应: {response.text[:200]}")
                break
            
            data = response.json()
            items = data.get('Campaigns', [])
            
            if not items:
                break
            
            campaigns.extend(items)
            print(f"   第 {page} 页: {len(items)} 个 campaigns (累计: {len(campaigns)})")
            
            # 达到限制或没有更多数据
            if len(campaigns) >= max_campaigns or not data.get('@nextpageuri'):
                break
            
            page += 1
            time.sleep(0.5)  # 避免速率限制
            
        except Exception as e:
            print(f"❌ 获取 Impact campaigns 失败: {e}")
            break
    
    print(f"✅ 共获取 {len(campaigns)} 个 Impact campaigns")
    return campaigns[:max_campaigns]  # 确保不超过限制

def fetch_impact_catalogs(sid: str, token: str, campaign_id: int) -> List[Dict]:
    """获取指定 campaign 的产品目录"""
    try:
        url = f"{IMPACT_API_BASE}/Mediapartners/{sid}/Catalogs"
        
        response = requests.get(
            url,
            auth=(sid, token),
            headers={
                'IR-Version': IMPACT_API_VERSION,
                'Accept': 'application/json'
            },
            params={
                'CampaignId': campaign_id,
                'PageSize': 100
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get('Catalogs', [])
        
        return []
    except Exception as e:
        print(f"⚠️  获取 catalog 失败 (campaign {campaign_id}): {e}")
        return []

# =============================================================================
# MyLead API
# =============================================================================

def fetch_mylead_offers(token: str) -> List[Dict]:
    """获取 MyLead 已加入的 offers"""
    print("\n📥 正在从 MyLead 获取 offers...")
    
    # MyLead API 端点需要确认（从文档或实际测试）
    # 这里使用推测的端点，需要根据实际 API 调整
    
    offers = []
    
    try:
        # 尝试获取已加入的 offers
        response = requests.get(
            f"{MYLEAD_API_BASE}/programs",  # 需要确认实际端点
            headers={
                'Authorization': f'Bearer {token}',
                'Accept': 'application/json'
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                offers = data.get('data', [])
                print(f"✅ 共获取 {len(offers)} 个 MyLead offers")
        else:
            print(f"⚠️  MyLead API 返回: {response.status_code}")
            print(f"   响应: {response.text[:200]}")
            
    except Exception as e:
        print(f"❌ 获取 MyLead offers 失败: {e}")
    
    return offers

# =============================================================================
# CF-Tracking API
# =============================================================================

def get_cf_tracking_token() -> Optional[str]:
    """登录 CF-Tracking 获取 token"""
    try:
        response = requests.post(
            f"{CF_TRACKING_API}/auth/login",
            json={
                'username': 'admin',
                'password': 'admin123'
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                return data['data']['token']
        
        return None
    except Exception as e:
        print(f"❌ CF-Tracking 登录失败: {e}")
        return None

def sync_offer_to_cf_tracking(token: str, offer_data: Dict) -> bool:
    """同步一个 offer 到 CF-Tracking"""
    try:
        response = requests.post(
            f"{CF_TRACKING_API}/offers",
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            },
            json=offer_data,
            timeout=10
        )
        
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"   ❌ 同步失败: {e}")
        return False

# =============================================================================
# 数据转换
# =============================================================================

def convert_impact_campaign_to_offer(campaign: Dict, catalogs: List[Dict]) -> Dict:
    """将 Impact campaign 转换为 CF-Tracking offer 格式"""
    campaign_id = campaign.get('CampaignId')
    campaign_name = campaign.get('CampaignName', 'Unknown')
    
    # 生成 tracking URL（使用实际的 Impact tracking link）
    tracking_url = f"https://impact.sjv.io/c/1140684/{campaign_id}"
    
    return {
        'name': campaign_name,
        'url': tracking_url,  # 必需字段
        'external_id': f"IMPACT-{campaign_id}",
        'network': 'Impact',
        'network_id': str(campaign_id),
        'payout': extract_payout(campaign),
        'payout_type': 'percentage',  # 或 'fixed'，需要解析
        'currency': campaign.get('Currency', 'USD'),
        'countries': ['US', 'CA'],  # 需要从 campaign 解析
        'preview_url': campaign.get('PreviewUrl', ''),
        'status': 'active',
        'has_catalog': len(catalogs) > 0,
        'catalog_count': len(catalogs),
        'metadata': {
            'campaign_id': campaign_id,
            'campaign_url': campaign.get('CampaignUrl', ''),
            'default_payout': campaign.get('DefaultPayout'),
            'catalogs': [c.get('Id') for c in catalogs]
        }
    }

def convert_mylead_offer_to_offer(offer: Dict) -> Dict:
    """将 MyLead offer 转换为 CF-Tracking offer 格式"""
    offer_id = offer.get('id', 'unknown')
    tracking_link = offer.get('tracking_link', '')
    
    # 如果没有 tracking_link，生成一个占位符
    if not tracking_link:
        tracking_link = f"https://mylead.global/offer/{offer_id}"
    
    return {
        'name': offer.get('name', 'Unknown'),
        'url': tracking_link,  # 必需字段
        'external_id': f"MYLEAD-{offer_id}",
        'network': 'MyLead',
        'network_id': str(offer_id),
        'payout': offer.get('payout', 0),
        'payout_type': 'fixed',  # 需要从 offer 解析
        'currency': 'USD',
        'countries': offer.get('countries', ['US']),
        'preview_url': offer.get('preview_url', ''),
        'status': 'active',
        'metadata': {
            'program_id': offer.get('program_id'),
            'category': offer.get('category'),
            'description': offer.get('description')
        }
    }

def extract_payout(campaign: Dict) -> float:
    """从 campaign 提取 payout 数值"""
    # 需要根据实际 Impact API 响应解析
    default_payout = campaign.get('DefaultPayout', {})
    if isinstance(default_payout, dict):
        return float(default_payout.get('Amount', 0))
    return 0.0

def generate_impact_tracking_url(campaign: Dict) -> str:
    """生成 Impact tracking URL"""
    campaign_id = campaign.get('CampaignId')
    # 实际的 tracking URL 需要从 campaign 或 catalogs 中获取
    return f"https://example.impact.com/c/1140684/{campaign_id}"

# =============================================================================
# 主流程
# =============================================================================

def main():
    print("="*70)
    print("CF-Tracking Offer 自动同步")
    print("="*70)
    
    # 1. 登录 CF-Tracking
    print("\n🔐 登录 CF-Tracking...")
    print(f"   API: {CF_TRACKING_API}")
    try:
        cf_token = get_cf_tracking_token()
        if not cf_token:
            print("❌ 无法登录 CF-Tracking，退出")
            return 1
        print("✅ CF-Tracking 登录成功")
    except Exception as e:
        print(f"❌ 登录异常: {e}")
        return 1
    
    synced_count = 0
    failed_count = 0
    
    # 2. 同步 Impact
    impact_creds = get_impact_credentials()
    if impact_creds:
        print("\n" + "="*70)
        print("📦 处理 Impact")
        print("="*70)
        
        campaigns = fetch_impact_campaigns(impact_creds['sid'], impact_creds['token'])
        
        for i, campaign in enumerate(campaigns, 1):
            campaign_id = campaign.get('CampaignId')
            campaign_name = campaign.get('CampaignName', 'Unknown')
            
            print(f"\n[{i}/{len(campaigns)}] {campaign_name} (ID: {campaign_id})")
            
            # 获取 catalogs
            catalogs = []
            if campaign_id:
                catalogs = fetch_impact_catalogs(
                    impact_creds['sid'], 
                    impact_creds['token'], 
                    campaign_id
                )
            
            # 转换并同步
            offer_data = convert_impact_campaign_to_offer(campaign, catalogs)
            
            if sync_offer_to_cf_tracking(cf_token, offer_data):
                print(f"   ✅ 同步成功")
                synced_count += 1
            else:
                print(f"   ❌ 同步失败")
                failed_count += 1
            
            time.sleep(0.3)  # 避免速率限制
    
    # 3. 同步 MyLead
    mylead_token = get_mylead_token()
    if mylead_token:
        print("\n" + "="*70)
        print("📦 处理 MyLead")
        print("="*70)
        
        offers = fetch_mylead_offers(mylead_token)
        
        for i, offer in enumerate(offers, 1):
            offer_name = offer.get('name', 'Unknown')
            offer_id = offer.get('id', 'N/A')
            
            print(f"\n[{i}/{len(offers)}] {offer_name} (ID: {offer_id})")
            
            # 转换并同步
            offer_data = convert_mylead_offer_to_offer(offer)
            
            if sync_offer_to_cf_tracking(cf_token, offer_data):
                print(f"   ✅ 同步成功")
                synced_count += 1
            else:
                print(f"   ❌ 同步失败")
                failed_count += 1
            
            time.sleep(0.3)
    
    # 4. 总结
    print("\n" + "="*70)
    print("同步完成")
    print("="*70)
    print(f"✅ 成功: {synced_count}")
    print(f"❌ 失败: {failed_count}")
    print(f"📊 总计: {synced_count + failed_count}")
    
    # 5. 保存同步记录
    report_path = os.path.join(
        AFFILIATE_OPS_HOME,
        'reports',
        f'offer-sync-{datetime.now().strftime("%Y%m%d-%H%M%S")}.json'
    )
    
    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'synced': synced_count,
                'failed': failed_count,
                'total': synced_count + failed_count
            }, f, indent=2)
        print(f"\n📄 同步记录已保存: {report_path}")
    except Exception as e:
        print(f"⚠️  保存记录失败: {e}")
    
    return 0 if failed_count == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
