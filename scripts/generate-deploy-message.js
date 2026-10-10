/**
 * @fileoverview Generate Deploy Message Script
 * @description Generate detailed deploy message from Git information
 * @module scripts/generate-deploy-message
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function main() {
  try {
    console.log('🚀 生成详细部署消息...');
    
    // 获取 Git 提交信息
    const gitInfo = getGitInfo();
    console.log('📊 Git 信息:', JSON.stringify(gitInfo, null, 2));
    
    // 获取变更的文件列表
    const changedFiles = getChangedFiles();
    console.log('📁 变更的文件:', changedFiles);
    
    // 生成部署消息
    const deployMessage = generateDeployMessage(gitInfo, changedFiles);
    console.log('📝 生成的部署消息:', deployMessage);
    
    // 保存部署消息到文件
    const deployMessagePath = path.join('dist', 'deploy-message.txt');
    fs.writeFileSync(deployMessagePath, deployMessage);
    console.log('💾 部署消息已保存到:', deployMessagePath);
    
    // 生成详细的部署信息文件
    const deployInfo = {
      timestamp: new Date().toISOString(),
      ...gitInfo,
      changedFiles,
      environment: process.env.NODE_ENV || 'production',
      deployer: process.env.USER || 'unknown',
      deploymentId: `deploy-${Date.now()}`,
      message: deployMessage,
      deploymentNotes: `Automated deployment at ${new Date().toLocaleString()}`,
    };
    
    const deployInfoPath = path.join('dist', 'deploy-info.json');
    fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
    console.log('💾 详细部署信息已保存到:', deployInfoPath);
    
  } catch (error) {
    console.error('❌ 生成部署消息失败:', error);
    process.exit(1);
  }
}

/**
 * 获取 Git 提交信息
 */
function getGitInfo() {
  try {
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const message = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    const author = execSync('git log -1 --pretty=%an', { encoding: 'utf8' }).trim();
    const commitDate = execSync('git log -1 --pretty=%ci', { encoding: 'utf8' }).trim();
    
    return {
      hash,
      shortHash,
      branch,
      message,
      author,
      commitDate,
    };
  } catch (error) {
    console.warn('⚠️  无法获取 Git 信息:', error.message);
    return {
      hash: 'unknown',
      shortHash: 'unknown',
      branch: 'unknown',
      message: 'Unknown commit',
      author: 'unknown',
      commitDate: new Date().toISOString(),
    };
  }
}

/**
 * 获取变更的文件列表
 */
function getChangedFiles() {
  try {
    // 获取最近一次提交的变更文件
    const changedFilesOutput = execSync('git show --name-only --pretty=format:', { encoding: 'utf8' }).trim();
    if (changedFilesOutput) {
      return changedFilesOutput.split('\n').filter(file => file.trim());
    }
    
    // 如果没有变更文件，返回空数组
    return [];
  } catch (error) {
    console.warn('⚠️  无法获取变更文件:', error.message);
    return [];
  }
}

/**
 * 生成部署消息
 */
function generateDeployMessage(gitInfo, changedFiles) {
  const { shortHash, message, author, commitDate } = gitInfo;
  
  let deployMessage = `Deploy ${shortHash} - ${message}\n`;
  deployMessage += `Author: ${author}\n`;
  deployMessage += `Commit Date: ${commitDate}\n`;
  
  if (changedFiles.length > 0) {
    deployMessage += `Changed Files (${changedFiles.length}):\n`;
    changedFiles.forEach(file => {
      deployMessage += `  - ${file}\n`;
    });
  }
  
  deployMessage += `Deployment Time: ${new Date().toISOString()}`;
  
  return deployMessage;
}

main();
