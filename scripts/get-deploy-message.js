/**
 * @fileoverview Get Deploy Message Script
 * @description Generate deploy message from deploy-info.json for wrangler deploy --message
 * @module scripts/get-deploy-message
 */

import fs from 'fs';
import path from 'path';

async function main() {
  try {
    console.log('📝 生成部署消息...');
    
    // 读取部署信息文件
    const deployInfoPath = path.join('dist', 'deploy-info.json');
    if (!fs.existsSync(deployInfoPath)) {
      console.error('❌ 部署信息文件不存在:', deployInfoPath);
      process.exit(1);
    }
    
    const deployInfoContent = fs.readFileSync(deployInfoPath, 'utf8');
    const deployInfo = JSON.parse(deployInfoContent);
    
    // 生成部署消息
    const deployMessage = `${deployInfo.message} (${deployInfo.shortHash})`;
    
    // 保存部署消息到文件
    const deployMessagePath = path.join('dist', 'deploy-message.txt');
    fs.writeFileSync(deployMessagePath, deployMessage);
    
    console.log('✅ 部署消息已生成:', deployMessage);
    console.log('💾 部署消息已保存到:', deployMessagePath);
  } catch (error) {
    console.error('❌ 生成部署消息失败:', error);
    process.exit(1);
  }
}

main();
