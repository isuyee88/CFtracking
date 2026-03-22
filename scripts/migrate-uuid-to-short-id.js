/**
 * @fileoverview 数据迁移脚本 - UUID 转短 ID
 * @description 使用 better-sqlite3 将现有数据库中的 UUID 格式 ID 转换为短 ID 格式
 * @usage: node scripts/migrate-uuid-to-short-id.js
 */

const path = require('path');
const fs = require('fs');

// 数据库路径
const DB_PATH = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', '8dc3781a15ca110320d93a45431cae5a78ad96bf0c083b8b63e3d27c90f7c161.sqlite');

// 检查数据库文件是否存在
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ 数据库文件不存在:', DB_PATH);
  console.log('请先运行：npm run dev 启动本地开发服务器');
  process.exit(1);
}

console.log('📦 开始执行数据迁移：UUID -> 短 ID');
console.log('数据库路径:', DB_PATH);

let db;
try {
  // 尝试使用 better-sqlite3
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  
  console.log('✅ 数据库连接成功');
  
  // 读取并执行迁移 SQL
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, '..', 'schema', 'migrations', '027_migrate_uuid_to_short_id.sql'),
    'utf-8'
  );
  
  // SQLite 不支持批量执行，需要分割 SQL 语句
  const statements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  
  console.log(`⏳ 执行 ${statements.length} 条 SQL 语句...`);
  
  let executed = 0;
  for (const stmt of statements) {
    try {
      db.exec(stmt);
      executed++;
      if (executed % 5 === 0) {
        console.log(`  已执行 ${executed}/${statements.length} 条语句`);
      }
    } catch (error) {
      console.warn(`⚠️  语句执行失败（可能已存在）: ${error.message}`);
    }
  }
  
  console.log(`✅ 迁移成功完成！执行了 ${executed}/${statements.length} 条语句`);
  
  // 验证迁移结果
  const campaigns = db.prepare('SELECT id, displayId, name FROM campaigns LIMIT 5').all();
  console.log('\n📊 迁移后的 Campaign 示例:');
  campaigns.forEach(row => {
    console.log(`  ${row.id} (${row.displayId}) - ${row.name}`);
  });
  
  const flows = db.prepare('SELECT id, displayId, campaignId, name FROM flows LIMIT 5').all();
  console.log('\n📊 迁移后的 Flow 示例:');
  flows.forEach(row => {
    console.log(`  ${row.id} - ${row.name} (campaignId: ${row.campaignId})`);
  });
  
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('better-sqlite3')) {
    console.error('❌ 未安装 better-sqlite3 模块');
    console.log('请安装：npm install --save-dev better-sqlite3');
  } else {
    console.error('❌ 迁移失败:', error.message);
  }
  process.exit(1);
} finally {
  if (db) {
    db.close();
  }
}
