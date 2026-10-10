/**
 * @fileoverview Deploy with Git Commit Script
 * @description Automatically commit changes and deploy to Cloudflare
 * @module scripts/deploy-with-git-commit
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function main() {
  try {
    console.log('🚀 开始部署流程...');
    
    // 1. 检查 Git 状态
    console.log('🔍 检查 Git 状态...');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    
    if (gitStatus) {
      console.log('📝 发现未提交的更改，准备提交...');
      
      // 2. 添加所有更改
      console.log('📁 添加所有更改到暂存区...');
      execSync('git add .', { stdio: 'inherit' });
      
      // 3. 生成提交消息
      const commitMessage = `deploy: automated deployment on ${new Date().toISOString()}`;
      console.log('✍️  生成提交消息:', commitMessage);
      
      // 4. 执行 Git 提交
      console.log('🚀 执行 Git 提交...');
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      
      console.log('✅ Git 提交成功！');
    } else {
      console.log('ℹ️  没有未提交的更改，使用当前 commit 信息...');
    }
    
    // 5. 生成部署消息
    console.log('📝 生成部署消息...');
    execSync('node scripts/generate-deploy-message.js', { stdio: 'inherit' });
    
    // 6. 执行 Cloudflare 部署
    console.log('☁️  部署到 Cloudflare...');
    const deployMessage = fs.readFileSync(path.join('dist', 'deploy-message.txt'), 'utf8');
    execSync(`wrangler deploy --keep-vars --message "${deployMessage.replace(/"/g, '\"')}"`, {
      stdio: 'inherit',
    });
    
    console.log('🎉 部署完成！');
    
  } catch (error) {
    console.error('❌ 部署失败:', error);
    process.exit(1);
  }
}

main();
