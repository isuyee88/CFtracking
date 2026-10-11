/**
 * @fileoverview Compliance Footer 渲染器
 * @description 渲染合规信息和免责声明
 */

interface ComplianceData {
  ageRestriction: string;
  termsText: string;
  responsibleGamblingText: string;
  affiliateDisclosure: string;
}

/**
 * 渲染合规 Footer
 */
export function renderComplianceFooter(compliance: ComplianceData): string {
  return `
    <div class="compliance-footer">
      <div class="compliance-badges">
        <span class="badge-age">${compliance.ageRestriction}</span>
        <span class="badge-terms">${compliance.termsText}</span>
        <span class="badge-responsible">${compliance.responsibleGamblingText}</span>
      </div>
      
      <p class="affiliate-disclosure">
        ${compliance.affiliateDisclosure}
      </p>
      
      <div class="footer-links">
        <a href="/terms" rel="nofollow">Terms & Conditions</a>
        <span class="separator">•</span>
        <a href="/privacy" rel="nofollow">Privacy Policy</a>
        <span class="separator">•</span>
        <a href="/responsible-gambling" rel="nofollow">Responsible Gambling</a>
      </div>
    </div>
  `;
}

/**
 * 渲染 Compliance Footer 的 CSS
 */
export function renderComplianceCSS(): string {
  return `
    .compliance-footer {
      background: #f8f9fa;
      border-top: 2px solid #e9ecef;
      padding: 32px 20px;
      margin-top: 48px;
      text-align: center;
    }
    
    .compliance-badges {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }
    
    .compliance-badges span {
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.875rem;
    }
    
    .badge-age {
      background: #dc2626;
      color: white;
    }
    
    .badge-terms {
      background: #2563eb;
      color: white;
    }
    
    .badge-responsible {
      background: #16a34a;
      color: white;
    }
    
    .affiliate-disclosure {
      font-size: 0.875rem;
      color: #6b7280;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto 24px;
      padding: 16px;
      background: #fff;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    
    .footer-links {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 0.875rem;
    }
    
    .footer-links a {
      color: #4b5563;
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .footer-links a:hover {
      color: #667eea;
      text-decoration: underline;
    }
    
    .footer-links .separator {
      color: #d1d5db;
    }
    
    @media (max-width: 768px) {
      .compliance-badges {
        flex-direction: column;
      }
      
      .footer-links {
        flex-direction: column;
      }
      
      .footer-links .separator {
        display: none;
      }
    }
  `;
}
