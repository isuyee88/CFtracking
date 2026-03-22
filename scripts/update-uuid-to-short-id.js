/**
 * @fileoverview 直接更新数据库中的旧 UUID 数据为短 ID 格式
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', '8dc3781a15ca110320d93a45431cae5a78ad96bf0c083b8b63e3d27c90f7c161.sqlite');

const db = new Database(DB_PATH);

console.log('📦 开始更新数据库中的 UUID 数据为短 ID 格式...\n');

// 获取所有 flows
const flows = db.prepare('SELECT id, displayId, campaignId, name FROM flows').all();
console.log(`找到 ${flows.length} 条 Flow 数据`);

// 更新 flows 表的 id 为 displayId（短 ID）
let updated = 0;
for (const flow of flows) {
  if (flow.id !== flow.displayId) {
    db.prepare('UPDATE flows SET id = displayId WHERE id = ?').run(flow.id);
    console.log(`  更新 Flow: ${flow.id} -> ${flow.displayId}`);
    updated++;
  }
}
console.log(`更新了 ${updated} 条 Flow 数据`);

// 获取所有 campaigns
const campaigns = db.prepare('SELECT id, displayId FROM campaigns').all();
console.log(`\n找到 ${campaigns.length} 条 Campaign 数据`);

// 更新 campaigns 表的 id 为 displayId（短 ID）
updated = 0;
for (const campaign of campaigns) {
  if (campaign.id !== campaign.displayId) {
    db.prepare('UPDATE campaigns SET id = displayId WHERE id = ?').run(campaign.id);
    console.log(`  更新 Campaign: ${campaign.id} -> ${campaign.displayId}`);
    updated++;
  }
}
console.log(`更新了 ${updated} 条 Campaign 数据`);

// 更新 flows 表的 campaignId 外键
const flows2 = db.prepare('SELECT id, campaignId FROM flows').all();
updated = 0;
for (const flow of flows2) {
  // 查找对应的 campaign displayId
  const campaign = campaigns.find(c => c.id === flow.campaignId);
  if (campaign && campaign.id !== campaign.displayId) {
    db.prepare('UPDATE flows SET campaignId = ? WHERE campaignId = ?').run(campaign.displayId, campaign.id);
    console.log(`  更新 Flow ${flow.id} 的 campaignId: ${flow.campaignId} -> ${campaign.displayId}`);
    updated++;
  }
}
console.log(`更新了 ${updated} 条 Flow campaignId`);

// 验证结果
console.log('\n📊 验证结果:');

// Flows
const flowsAfter = db.prepare('SELECT id, displayId, campaignId, name FROM flows').all();
console.log('Flows:');
flowsAfter.forEach(f => {
  console.log(`  ${f.id} | ${f.campaignId} | ${f.name}`);
});

// Campaigns
const campaignsAfter = db.prepare('SELECT id, displayId, name FROM campaigns').all();
console.log('\nCampaigns:');
campaignsAfter.forEach(c => {
  console.log(`  ${c.id} | ${c.name}`);
});

db.close();
console.log('\n✅ 数据库更新完成!');
