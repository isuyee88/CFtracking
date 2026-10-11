/**
 * @fileoverview 广告素材生成服务
 * @description 基于模板和 AI 生成流量平台广告素材
 */

export interface CreativeTemplate {
  id: string;
  name: string;
  platform: string;
  format: 'push' | 'onclick' | 'interstitial' | 'native';
  
  // 素材规格
  specs: {
    title_max_length?: number;
    description_max_length?: number;
    image_sizes?: string[]; // ['300x250', '728x90']
    required_fields?: string[];
  };
  
  // 模板内容
  templates: {
    titles?: string[];
    descriptions?: string[];
    ctas?: string[]; // Call to Action
  };
}

export interface CreativeGenerationRequest {
  template_id?: string;
  platform: string;
  format: 'push' | 'onclick' | 'interstitial' | 'native';
  
  // 可选覆盖
  offer_name?: string;
  offer_description?: string;
  target_geo?: string;
  target_device?: string;
  
  // 生成数量
  count?: number;
}

export interface GeneratedCreative {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  cta?: string;
  platform: string;
  format: string;
  metadata?: any;
}

export class CreativeGenerationService {
  constructor(private db: D1Database) {}

  /**
   * 生成广告素材
   */
  async generateCreatives(request: CreativeGenerationRequest): Promise<GeneratedCreative[]> {
    const count = request.count || 3;
    const creatives: GeneratedCreative[] = [];

    // 获取模板（如果指定）
    let template: CreativeTemplate | null = null;
    if (request.template_id) {
      template = await this.getTemplate(request.template_id);
    }

    // 如果没有模板，使用默认模板
    if (!template) {
      template = this.getDefaultTemplate(request.platform, request.format);
    }

    // 生成多个素材变体
    for (let i = 0; i < count; i++) {
      const creative = await this.generateSingleCreative(request, template, i);
      creatives.push(creative);
    }

    return creatives;
  }

  /**
   * 生成单个素材
   */
  private async generateSingleCreative(
    request: CreativeGenerationRequest,
    template: CreativeTemplate,
    index: number
  ): Promise<GeneratedCreative> {
    // 随机选择标题和描述
    const title = this.selectRandomItem(template.templates.titles || []) || 
                  this.generateDefaultTitle(request);
    
    const description = this.selectRandomItem(template.templates.descriptions || []) || 
                       this.generateDefaultDescription(request);
    
    const cta = this.selectRandomItem(template.templates.ctas || []) || 
                'Learn More';

    const id = `creative-${Date.now()}-${index}-${Math.random().toString(36).substring(7)}`;

    return {
      id,
      title,
      description,
      cta,
      platform: request.platform,
      format: request.format,
      metadata: {
        template_id: template.id,
        generated_at: new Date().toISOString(),
        variant: index + 1
      }
    };
  }

  /**
   * 获取模板
   */
  private async getTemplate(templateId: string): Promise<CreativeTemplate | null> {
    // TODO: 从数据库读取
    return null;
  }

  /**
   * 获取默认模板
   */
  private getDefaultTemplate(platform: string, format: string): CreativeTemplate {
    return {
      id: 'default',
      name: `Default ${platform} ${format}`,
      platform,
      format: format as any,
      specs: {
        title_max_length: 30,
        description_max_length: 45
      },
      templates: {
        titles: [
          '🔥 Hot Offer Inside!',
          '💰 Exclusive Deal Today',
          '⚡ Limited Time Offer',
          '🎁 Special Bonus Available',
          '✨ Don\'t Miss Out!'
        ],
        descriptions: [
          'Click to claim your exclusive bonus now!',
          'Join thousands of satisfied customers today.',
          'Act fast - offer expires soon!',
          'Get instant access to premium benefits.',
          'Start earning rewards immediately.'
        ],
        ctas: [
          'Claim Now',
          'Get Started',
          'Learn More',
          'Sign Up Free',
          'Grab Offer'
        ]
      }
    };
  }

  /**
   * 生成默认标题
   */
  private generateDefaultTitle(request: CreativeGenerationRequest): string {
    if (request.offer_name) {
      return `${request.offer_name} - Special Offer!`;
    }
    return '🔥 Exclusive Offer Available!';
  }

  /**
   * 生成默认描述
   */
  private generateDefaultDescription(request: CreativeGenerationRequest): string {
    if (request.offer_description) {
      return request.offer_description.substring(0, 45);
    }
    return 'Click to discover amazing deals today!';
  }

  /**
   * 随机选择项目
   */
  private selectRandomItem<T>(items: T[]): T | undefined {
    if (items.length === 0) return undefined;
    return items[Math.floor(Math.random() * items.length)];
  }

  /**
   * 批量生成并保存到平台
   */
  async generateAndUpload(
    request: CreativeGenerationRequest,
    campaignId: string
  ): Promise<{ success: boolean; creatives: GeneratedCreative[]; errors?: string[] }> {
    try {
      // 生成素材
      const creatives = await this.generateCreatives(request);

      // TODO: 上传到流量平台
      // 目前只返回生成的素材，实际上传由各平台客户端实现

      console.log(`[CreativeGeneration] Generated ${creatives.length} creatives for campaign ${campaignId}`);

      return {
        success: true,
        creatives
      };
    } catch (error) {
      return {
        success: false,
        creatives: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
}
