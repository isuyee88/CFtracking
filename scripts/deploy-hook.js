/**
 * @fileoverview 部署钩子脚本
 * @description 在 Cloudflare Workers 部署时自动提交源数据和消息
 * @module scripts/deploy-hook
 * 
 * 功能：
 * 1. 获取当前 git 提交信息
 * 2. 生成部署消息
 * 3. 保存部署信息到文件
 * 4. 可选：发送到知识库图谱
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 主函数
async function main() {
  try {
    console.log('🚀 执行部署钩子脚本...');

    // 获取 git 提交信息
    console.log('🔍 获取 Git 提交信息...');
    const gitInfo = getGitInfo();
    console.log('📊 Git 信息:', JSON.stringify(gitInfo, null, 2));

    // 生成部署信息
    console.log('📝 生成部署信息...');
    const deployInfo = {
      timestamp: new Date().toISOString(),
      ...gitInfo,
      environment: process.env.NODE_ENV || 'production',
      deployer: process.env.USER || 'unknown',
      deploymentId: `deploy-${Date.now()}`,
      message: `Deployed version ${gitInfo.shortHash} - ${gitInfo.message} (${new Date().toISOString()})`,
      deploymentNotes: `Automated deployment at ${new Date().toLocaleString()}`,
    };

    console.log('📦 部署信息:', JSON.stringify(deployInfo, null, 2));

    // 保存部署信息到文件
    console.log('💾 保存部署信息到文件...');
    saveDeployInfo(deployInfo);

    // 可选：发送到知识库图谱
    // await sendToKnowledgeGraph(deployInfo);

    console.log('✅ 部署钩子执行完成');
  } catch (error) {
    console.error('❌ 部署钩子执行失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    // 即使失败也继续部署
  }
}

/**
 * 获取 git 提交信息
 */
function getGitInfo() {
  try {
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const message = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    const author = execSync('git log -1 --pretty=%an', { encoding: 'utf8' }).trim();
    const authorEmail = execSync('git log -1 --pretty=%ae', { encoding: 'utf8' }).trim();
    const commitDate = execSync('git log -1 --pretty=%ci', { encoding: 'utf8' }).trim();

    return {
      hash,
      shortHash,
      branch,
      message,
      author,
      authorEmail,
      commitDate,
    };
  } catch (error) {
    console.warn('⚠️  无法获取 git 信息:', error.message);
    return {
      hash: 'unknown',
      shortHash: 'unknown',
      branch: 'unknown',
      message: 'Unknown commit',
      author: 'unknown',
      authorEmail: 'unknown',
      commitDate: new Date().toISOString(),
    };
  }
}

/**
 * 保存部署信息到文件
 */
function saveDeployInfo(deployInfo) {
  // 在 ES 模块中获取当前文件路径
  let __filename = new URL(import.meta.url).pathname;
  
  // 处理 Windows 路径格式
  if (process.platform === 'win32') {
    // 移除 file:/// 前缀并修复路径格式
    __filename = __filename.replace(/^\//, '').replace(/\//g, '\\');
  }
  
  const __dirname = path.dirname(__filename);
  
  const deployInfoPath = path.join(__dirname, '..', 'dist', 'deploy-info.json');
  
  // 确保 dist 目录存在
  const distDir = path.dirname(deployInfoPath);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
  console.log('💾 部署信息已保存到:', deployInfoPath);
}

/**
 * 发送到知识库图谱
 */
async function sendToKnowledgeGraph(deployInfo) {
  try {
    // 这里可以实现与知识库图谱的集成
    // 例如通过 API 调用将部署信息发送到图谱
    console.log('📡 发送部署信息到知识库图谱...');
    // 实现逻辑...
  } catch (error) {
    console.warn('⚠️  发送到知识库图谱失败:', error.message);
  }
}

// 执行主函数
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.includes('deploy-hook.js')) {
  main();
}

export { main, getGitInfo, saveDeployInfo, sendToKnowledgeGraph };
