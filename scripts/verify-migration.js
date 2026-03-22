/**
 * @fileoverview 验证数据库迁移结果
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', '8dc3781a15ca110320d93a45431cae5a78ad96bf0c083b8b63e3d27c90f7c161.sqlite');

const db = new Database(DB_PATH);

console.log('📊 验证数据库结构...\n');

// 检查 campaigns 表结构
console.log('📋 Campaigns 表结构:');
const campaignColumns = db.prepare("PRAGMA table_info(campaigns)").all();
const hasDisplayId = campaignColumns.some(col => col.name === 'displayId');
console.log(`  displayId 列: ${hasDisplayId ? '✅ 存在' : '❌ 不存在'}`);

// 检查 idCounters 表
console.log('\n📋 idCounters 表:');
try {
  const counters = db.prepare('SELECT * FROM idCounters').all();
  if (counters.length === 0) {
    console.log('  ℹ️  表为空（正常，将在创建第一个记录时自动初始化）');
  } else {
    counters.forEach(counter => {
      console.log(`  ${counter.tableName}: ${counter.currentNumber}`);
    });
  }
} catch (error) {
  console.log('  ❌ 无法查询 idCounters');
}

// 检查示例数据
console.log('\n📊 示例数据:');
try {
  const campaigns = db.prepare('SELECT id, displayId, name, alias FROM campaigns LIMIT 3').all();
  console.log('  Campaigns:');
  if (campaigns.length === 0) {
    console.log('    (无数据)');
  } else {
    campaigns.forEach(c => {
      console.log(`    ${c.id} | ${c.displayId || 'NULL'} | ${c.name} | ${c.alias}`);
    });
  }
} catch (error) {
  console.log('  ❌ 无法查询 campaigns');
}

try {
  const flows = db.prepare('SELECT id, displayId, campaignId, name FROM flows LIMIT 3').all();
  console.log('  Flows:');
  if (flows.length === 0) {
    console.log('    (无数据)');
  } else {
    flows.forEach(f => {
      console.log(`    ${f.id} | ${f.displayId || 'NULL'} | ${f.campaignId} | ${f.name}`);
    });
  }
} catch (error) {
  console.log('  ❌ 无法查询 flows');
}

db.close();
console.log('\n✅ 验证完成!');
