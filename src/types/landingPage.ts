/**
 * @fileoverview Landing Page 类型定义（扩展版）
 * @description 定义 Landing Page 实体及其相关 DTO 类型
 * @module types/landingPage
 */

export type LandingPageStatus = 'active' | 'paused' | 'deleted';
export type LandingPageTemplate = 'betting-comparison' | 'casino-review' | 'poker-bonus' | 'custom';

export interface LandingPage {
  id: string;
  displayId?: string;
  name: string;
  url: string;
  slug?: string;
  status: LandingPageStatus;
  group?: string;
  
  // 新增：模板和内容
  template?: LandingPageTemplate;
  content?: LandingPageContent;
  
  // 新增：SEO
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  
  // 新增：地理定位
  geo_targeting?: string[];
  
  // 新增：合规
  compliance_version?: string;
  is_public?: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface LandingPageContent {
  meta: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
  };
  header: {
    headline: string;
    subheadline?: string;
    description?: string;
    badges?: string[];
  };
  offers: Array<{
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
  }>;
  compliance: {
    ageRestriction: string;
    termsText: string;
    responsibleGamblingText: string;
    affiliateDisclosure: string;
  };
}

export interface CreateLandingPageDTO {
  name: string;
  url?: string;
  slug: string;
  template?: LandingPageTemplate;
  content?: LandingPageContent;
  seo_title?: string;
  seo_description?: string;
  geo_targeting?: string[];
  is_public?: boolean;
  group?: string;
}

export interface UpdateLandingPageDTO {
  name?: string;
  url?: string;
  slug?: string;
  status?: LandingPageStatus;
  template?: LandingPageTemplate;
  content?: LandingPageContent;
  seo_title?: string;
  seo_description?: string;
  geo_targeting?: string[];
  is_public?: boolean;
  group?: string;
}
