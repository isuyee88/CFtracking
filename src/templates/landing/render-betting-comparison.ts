/**
 * @fileoverview Betting Comparison 完整模板渲染器
 * @description 渲染完整的 Betting Sites Landing Page
 */

import { renderOfferCard, renderOfferCardCSS } from './render-offer-card';
import { renderComplianceFooter, renderComplianceCSS } from './render-compliance';
import type { LandingPageContent } from '@/types/landingPage';

/**
 * 渲染完整的 Betting Comparison Landing Page
 */
export function renderBettingComparisonTemplate(
  content: LandingPageContent,
  meta: {
    title: string;
    description: string;
    country?: string;
    landingPageId?: string;
  }
): string {
  const { header, offers, compliance } = content;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}">
  <style>
    /* 基础样式 */
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6; 
      color: #1a202c; 
      background: #f7fafc; 
    }
    
    .container { 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    
    /* Hero 区域 */
    .hero { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 60px 32px; 
      text-align: center; 
      border-radius: 16px; 
      margin-bottom: 48px;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
    }
    
    .hero h1 { 
      font-size: 2.75rem; 
      font-weight: 800; 
      margin-bottom: 1rem;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .hero .subheadline { 
      font-size: 1.375rem; 
      opacity: 0.95;
      font-weight: 300;
      font-style: italic;
      margin-bottom: 1.5rem;
    }
    
    .hero .description {
      font-size: 1.125rem;
      opacity: 0.9;
      max-width: 800px;
      margin: 0 auto 2rem;
      line-height: 1.7;
    }
    
    .badges { 
      display: flex; 
      gap: 12px; 
      justify-content: center; 
      flex-wrap: wrap; 
      margin-top: 24px; 
    }
    
    .badge { 
      background: rgba(255,255,255,0.2); 
      backdrop-filter: blur(10px);
      padding: 10px 20px; 
      border-radius: 24px; 
      font-size: 0.9rem;
      font-weight: 500;
      border: 1px solid rgba(255,255,255,0.3);
    }
    
    .location-info {
      margin-top: 16px;
      font-size: 0.95rem;
      opacity: 0.85;
    }
    
    /* Offers 容器 */
    .offers-container {
      margin-bottom: 48px;
    }
    
    ${renderOfferCardCSS()}
    ${renderComplianceCSS()}
    
    /* 页脚 */
    .page-footer {
      text-align: center;
      padding: 24px;
      color: #718096;
      font-size: 0.875rem;
    }
    
    /* 响应式 */
    @media (max-width: 768px) {
      .hero h1 {
        font-size: 2rem;
      }
      
      .hero .subheadline {
        font-size: 1.125rem;
      }
      
      .hero {
        padding: 40px 20px;
      }
      
      .container {
        padding: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Hero Section -->
    <div class="hero">
      <h1>${header.headline}</h1>
      ${header.subheadline ? `<p class="subheadline">${header.subheadline}</p>` : ''}
      ${header.description ? `<p class="description">${header.description}</p>` : ''}
      
      ${header.badges && header.badges.length > 0 ? `
        <div class="badges">
          ${header.badges.map(badge => `<span class="badge">${badge}</span>`).join('')}
        </div>
      ` : ''}
      
      ${meta.country ? `
        <div class="location-info">
          Ranked for readers in <strong>${meta.country}</strong>
        </div>
      ` : ''}
    </div>
    
    <!-- Offers List -->
    <div class="offers-container">
      ${offers && offers.length > 0 
        ? offers.map(offer => renderOfferCard(offer)).join('') 
        : '<p>No offers available at this time.</p>'
      }
    </div>
    
    <!-- Compliance Footer -->
    ${compliance ? renderComplianceFooter(compliance) : ''}
    
    <!-- Page Footer -->
    <div class="page-footer">
      <p>Powered by CF-Tracking ${meta.landingPageId ? `| Landing Page ID: ${meta.landingPageId}` : ''}</p>
    </div>
  </div>
</body>
</html>`;
}
