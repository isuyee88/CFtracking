/**
 * @fileoverview 检查数据库表结构
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', '8dc3781a15ca110320d93a45431cae5a78ad96bf0c083b8b63e3d27c90f7c161.sqlite');

const db = new Database(DB_PATH);

console.log('📊 数据库表列表:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(table => {
  console.log(`  - ${table.name}`);
});

console.log('\n📊 Campaigns 表结构:');
try {
  const columns = db.prepare("PRAGMA table_info(campaigns)").all();
  columns.forEach(col => {
    console.log(`  ${col.name} (${col.type})`);
  });
} catch (error) {
  console.log('  ❌ campaigns 表不存在');
}

console.log('\n📊 示例数据:');
try {
  const campaigns = db.prepare('SELECT id, displayId, name, alias FROM campaigns LIMIT 3').all();
  console.log('  Campaigns:');
  campaigns.forEach(c => {
    console.log(`    ${c.id} | ${c.displayId || 'NULL'} | ${c.name} | ${c.alias}`);
  });
} catch (error) {
  console.log('  ❌ 无法查询 campaigns');
}

db.close();
