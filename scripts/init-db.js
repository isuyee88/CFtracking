/**
 * @fileoverview 初始化数据库 schema
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', '8dc3781a15ca110320d93a45431cae5a78ad96bf0c083b8b63e3d27c90f7c161.sqlite');

const db = new Database(DB_PATH);

console.log('📦 初始化数据库 schema...');

// 读取初始 schema
const schemaSQL = fs.readFileSync(
  path.join(__dirname, '..', 'schema', 'migrations', '001_init.sql'),
  'utf-8'
);

try {
  db.exec(schemaSQL);
  console.log('✅ 基础 schema 创建成功');
} catch (error) {
  console.error('❌ 创建 schema 失败:', error.message);
}

// 读取后续迁移文件
const migrationDir = path.join(__dirname, '..', 'schema', 'migrations');
const migrationFiles = fs.readdirSync(migrationDir)
  .filter(f => f.endsWith('.sql') && f !== '001_init.sql')
  .sort();

console.log(`\n⏳ 执行 ${migrationFiles.length} 个迁移文件...`);

for (const file of migrationFiles) {
  try {
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
    db.exec(sql);
    console.log(`  ✅ ${file}`);
  } catch (error) {
    console.warn(`  ⚠️  ${file}: ${error.message}`);
  }
}

console.log('\n📊 创建的表:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(table => {
  console.log(`  - ${table.name}`);
});

db.close();
console.log('\n✅ 数据库初始化完成!');
