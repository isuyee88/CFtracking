/**
 * @fileoverview Offer Card 渲染器
 * @description 渲染单个 Offer 卡片的 HTML
 */

interface OfferCardData {
  offerId: string;
  rank: number;
  badge?: string;
  rating: number;
  logo: string;
  name: string;
  headline: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
  disclaimer: string;
}

/**
 * 渲染星级评分
 */
function renderStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  let stars = '★'.repeat(fullStars);
  if (hasHalfStar) stars += '☆';
  
  return stars;
}

/**
 * 渲染 Offer Card
 */
export function renderOfferCard(offer: OfferCardData): string {
  const stars = renderStars(offer.rating);
  
  return `
    <div class="offer-card" data-offer-id="${offer.offerId}">
      <div class="offer-header">
        <span class="rank">${offer.rank}</span>
        ${offer.badge ? `<span class="badge badge-primary">${offer.badge}</span>` : ''}
      </div>
      
      <div class="offer-rating">
        <span class="stars">${stars}</span>
        <span class="rating-value">${offer.rating}/5</span>
        <span class="rating-label">Editor's Rating</span>
      </div>
      
      <div class="offer-logo">
        ${offer.logo.length <= 3 
          ? `<div class="logo-abbr">${offer.logo}</div>` 
          : `<img src="${offer.logo}" alt="${offer.name}" />`
        }
      </div>
      
      <h3 class="offer-name">${offer.name}</h3>
      
      <p class="offer-headline">${offer.headline}</p>
      
      <ul class="offer-features">
        ${offer.features.map(feature => `
          <li>✓ ${feature}</li>
        `).join('')}
      </ul>
      
      <a href="${offer.ctaUrl}" class="cta-button" rel="nofollow sponsored">
        ${offer.ctaText}
      </a>
      
      <p class="offer-disclaimer">${offer.disclaimer}</p>
    </div>
  `;
}

/**
 * 渲染 Offer Card 的 CSS
 */
export function renderOfferCardCSS(): string {
  return `
    .offer-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 24px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .offer-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    
    .offer-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .rank {
      font-size: 2rem;
      font-weight: bold;
      color: #667eea;
      min-width: 40px;
    }
    
    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    
    .badge-primary {
      background: #667eea;
      color: white;
    }
    
    .offer-rating {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .stars {
      color: #fbbf24;
      font-size: 1.2rem;
      letter-spacing: 2px;
    }
    
    .rating-value {
      font-weight: 600;
      color: #333;
    }
    
    .rating-label {
      color: #666;
      font-size: 0.875rem;
    }
    
    .offer-logo {
      margin: 20px 0;
      text-align: center;
    }
    
    .logo-abbr {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 2rem;
      font-weight: bold;
      border-radius: 50%;
    }
    
    .offer-logo img {
      max-width: 120px;
      height: auto;
    }
    
    .offer-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a202c;
      margin: 12px 0;
    }
    
    .offer-headline {
      font-size: 1.125rem;
      color: #2d3748;
      font-weight: 600;
      margin-bottom: 16px;
    }
    
    .offer-features {
      list-style: none;
      padding: 0;
      margin: 16px 0;
    }
    
    .offer-features li {
      padding: 8px 0;
      color: #4a5568;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .offer-features li:last-child {
      border-bottom: none;
    }
    
    .cta-button {
      display: block;
      width: 100%;
      padding: 16px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1.125rem;
      margin: 20px 0 16px;
      transition: opacity 0.2s;
    }
    
    .cta-button:hover {
      opacity: 0.9;
    }
    
    .offer-disclaimer {
      font-size: 0.75rem;
      color: #718096;
      text-align: center;
      line-height: 1.4;
    }
    
    @media (max-width: 768px) {
      .offer-card {
        padding: 16px;
      }
      
      .offer-name {
        font-size: 1.25rem;
      }
      
      .offer-headline {
        font-size: 1rem;
      }
    }
  `;
}
