/**
 * @fileoverview 添加 displayId 列并执行数据迁移
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', '8dc3781a15ca110320d93a45431cae5a78ad96bf0c083b8b63e3d27c90f7c161.sqlite');

const db = new Database(DB_PATH);

console.log('📦 添加 displayId 列...');

// 为所有需要 displayId 的表添加列
const tables = [
  'campaigns',
  'flows',
  'landingPages',
  'offers',
  'trafficSources',
  'affiliateNetworks',
  'rules'
];

for (const table of tables) {
  try {
    // 检查列是否已存在
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    const hasDisplayId = columns.some(col => col.name === 'displayId');
    
    if (!hasDisplayId) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN displayId TEXT`);
      console.log(`  ✅ ${table}.displayId 列已添加`);
    } else {
      console.log(`  ℹ️  ${table}.displayId 列已存在`);
    }
  } catch (error) {
    console.error(`  ❌ ${table}: ${error.message}`);
  }
}

// 创建 displayId 索引
console.log('\n📦 创建 displayId 索引...');
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_campaigns_display_id ON campaigns(displayId)',
  'CREATE INDEX IF NOT EXISTS idx_flows_display_id ON flows(displayId)',
  'CREATE INDEX IF NOT EXISTS idx_landing_pages_display_id ON landingPages(displayId)',
  'CREATE INDEX IF NOT EXISTS idx_offers_display_id ON offers(displayId)',
  'CREATE INDEX IF NOT EXISTS idx_traffic_sources_display_id ON trafficSources(displayId)',
  'CREATE INDEX IF NOT EXISTS idx_affiliate_networks_display_id ON affiliateNetworks(displayId)',
  'CREATE INDEX IF NOT EXISTS idx_rules_display_id ON rules(displayId)'
];

for (const sql of indexes) {
  try {
    db.exec(sql);
    console.log(`  ✅ ${sql.split(' ')[3]}`);
  } catch (error) {
    console.warn(`  ⚠️  ${error.message}`);
  }
}

db.close();
console.log('\n✅ displayId 列添加完成!');
