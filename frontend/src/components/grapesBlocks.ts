/**
 * File: grapesBlocks.ts
 * Purpose: GrapesJS 联盟营销块集定义 + 导出 HTML 的清洗与自包含组装
 * Why: hosted-assets 渲染端点是公开的，导出内容入库前必须做深防御清洗（script 标签、on 事件属性、
 *      javascript 协议链接），防止管理员画布中粘贴的内容变成存储型 XSS；
 */

export interface AffiliateBlockDef {
    id: string;
    label: string;
    category: string;
    content: string;
}

export const AFFILIATE_BLOCK_CATEGORY = 'Affiliate';

const IMG_PLACEHOLDER = 'https://picsum.photos/seed/aff-product/400/300';

export const AFFILIATE_BLOCKS: AffiliateBlockDef[] = [
    {
        id: 'aff-hero',
        label: 'Hero Section',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<section style="padding:56px 24px;text-align:center;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;border-radius:12px;">
  <h1 style="margin:0 0 12px;font-size:34px;line-height:1.2;">Hero headline goes here</h1>
  <p style="margin:0 0 24px;font-size:17px;opacity:.92;">Supporting subheadline that explains the offer value.</p>
  <a href="#offer" style="display:inline-block;padding:14px 28px;background:#ffffff;color:#1d4ed8;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;">Get Started</a>
</section>`,
    },
    {
        id: 'aff-cta',
        label: 'CTA Button',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<div style="text-align:center;padding:24px 12px;">
  <a href="#offer" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#ffffff;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;box-shadow:0 4px 14px rgba(37,99,235,.35);">Claim Your Discount</a>
  <p style="margin:10px 0 0;font-size:12px;color:#64748b;">Limited time offer</p>
</div>`,
    },
    {
        id: 'aff-text',
        label: 'Text Section',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<section style="padding:8px 4px;">
  <h2 style="margin:0 0 10px;font-size:24px;color:#1a202c;">Section heading</h2>
  <p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#475569;">Write the body copy here. Keep paragraphs short and scannable for mobile readers.</p>
  <p style="margin:0;font-size:15px;line-height:1.7;color:#475569;">Add a second paragraph if needed.</p>
</section>`,
    },
    {
        id: 'aff-image',
        label: 'Image',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<figure style="margin:16px 0;">
  <img src="${IMG_PLACEHOLDER}" alt="Product image" style="width:100%;max-width:640px;border-radius:10px;display:block;margin:0 auto;" />
  <figcaption style="text-align:center;font-size:12px;color:#94a3b8;margin-top:6px;">Replace with your product image URL</figcaption>
</figure>`,
    },
    {
        id: 'aff-image-text',
        label: 'Image + Text',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:16px 0;">
  <img src="${IMG_PLACEHOLDER}" alt="Feature image" style="width:220px;height:160px;object-fit:cover;border-radius:10px;flex:0 0 auto;" />
  <div style="flex:1 1 240px;min-width:0;">
    <h3 style="margin:0 0 8px;font-size:19px;color:#1a202c;">Feature title</h3>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">Explain the feature benefit in one or two sentences.</p>
  </div>
</div>`,
    },
    {
        id: 'aff-review-card',
        label: 'Review Card',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<div style="max-width:560px;margin:20px auto;border:1px solid #e2e8f0;border-radius:12px;padding:20px;display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;background:#ffffff;">
  <img src="${IMG_PLACEHOLDER}" alt="Product image" style="width:140px;height:140px;object-fit:cover;border-radius:8px;flex:0 0 auto;" />
  <div style="flex:1 1 240px;min-width:0;">
    <h3 style="margin:0 0 6px;font-size:20px;color:#1a202c;">Product name</h3>
    <p style="margin:0 0 8px;color:#f59e0b;font-size:15px;">★★★★☆ 4.5 / 5</p>
    <p style="margin:0 0 12px;color:#475569;font-size:14px;line-height:1.6;">Short verdict summary for this product.</p>
    <a href="#offer" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Check Price</a>
  </div>
</div>`,
    },
    {
        id: 'aff-pros-cons',
        label: 'Pros & Cons',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<div style="display:flex;flex-wrap:wrap;gap:16px;margin:16px 0;">
  <div style="flex:1 1 220px;border:1px solid #bbf7d0;border-radius:10px;padding:16px;background:#f0fdf4;">
    <h3 style="margin:0 0 8px;font-size:16px;color:#166534;">👍 Pros</h3>
    <ul style="margin:0;padding-left:18px;font-size:14px;color:#166534;line-height:1.8;">
      <li>Advantage one</li><li>Advantage two</li>
    </ul>
  </div>
  <div style="flex:1 1 220px;border:1px solid #fecaca;border-radius:10px;padding:16px;background:#fef2f2;">
    <h3 style="margin:0 0 8px;font-size:16px;color:#991b1b;">👎 Cons</h3>
    <ul style="margin:0;padding-left:18px;font-size:14px;color:#991b1b;line-height:1.8;">
      <li>Drawback one</li><li>Drawback two</li>
    </ul>
  </div>
</div>`,
    },
    {
        id: 'aff-comparison',
        label: 'Comparison Table',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<div style="overflow-x:auto;margin:16px 0;">
  <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:420px;">
    <thead>
      <tr style="background:#2563eb;color:#ffffff;">
        <th style="padding:10px 12px;text-align:left;border-radius:8px 0 0 0;">Product</th>
        <th style="padding:10px 12px;text-align:left;">Rating</th>
        <th style="padding:10px 12px;text-align:left;border-radius:0 8px 0 0;">Best For</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 12px;">Product A</td><td style="padding:10px 12px;">4.8 / 5</td><td style="padding:10px 12px;">Overall value</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 12px;">Product B</td><td style="padding:10px 12px;">4.5 / 5</td><td style="padding:10px 12px;">Budget pick</td>
      </tr>
    </tbody>
  </table>
</div>`,
    },
    {
        id: 'aff-faq',
        label: 'FAQ',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<section style="margin:16px 0;">
  <h2 style="margin:0 0 12px;font-size:22px;color:#1a202c;">Frequently Asked Questions</h2>
  <details style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:8px;">
    <summary style="font-weight:600;cursor:pointer;color:#1a202c;">Question one?</summary>
    <p style="margin:8px 0 0;font-size:14px;color:#475569;line-height:1.7;">Answer one.</p>
  </details>
  <details style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
    <summary style="font-weight:600;cursor:pointer;color:#1a202c;">Question two?</summary>
    <p style="margin:8px 0 0;font-size:14px;color:#475569;line-height:1.7;">Answer two.</p>
  </details>
</section>`,
    },
    {
        id: 'aff-disclosure',
        label: 'FTC Disclosure',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<p style="margin:24px 0 0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;line-height:1.6;color:#64748b;">
Disclosure: This page contains affiliate links. We may earn a commission at no extra cost to you if you purchase through our links.
</p>`,
    },
    {
        id: 'aff-countdown',
        label: 'Countdown Timer',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<div style="text-align:center;padding:20px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin:16px 0;">
  <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#9a3412;">⏳ Offer expires in:</p>
  <div style="display:flex;justify-content:center;gap:10px;">
    <div style="background:#9a3412;color:#fff;border-radius:8px;padding:10px 14px;min-width:56px;"><span style="font-size:24px;font-weight:800;">02</span><br /><span style="font-size:11px;opacity:.85;">DAYS</span></div>
    <div style="background:#9a3412;color:#fff;border-radius:8px;padding:10px 14px;min-width:56px;"><span style="font-size:24px;font-weight:800;">11</span><br /><span style="font-size:11px;opacity:.85;">HOURS</span></div>
    <div style="background:#9a3412;color:#fff;border-radius:8px;padding:10px 14px;min-width:56px;"><span style="font-size:24px;font-weight:800;">45</span><br /><span style="font-size:11px;opacity:.85;">MINUTES</span></div>
  </div>
  <p style="margin:10px 0 0;font-size:12px;color:#9a3412;">Edit the numbers above to match your campaign deadline.</p>
</div>`,
    },
    {
        id: 'aff-coupon',
        label: 'Coupon Code',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<div style="text-align:center;margin:16px 0;padding:18px 12px;border:2px dashed #059669;border-radius:12px;background:#ecfdf5;">
  <p style="margin:0 0 8px;font-size:14px;color:#065f46;font-weight:600;">Exclusive discount for our readers:</p>
  <p style="margin:0;font-size:26px;font-weight:800;letter-spacing:2px;color:#059669;">SAVE20</p>
  <p style="margin:8px 0 0;font-size:12px;color:#047857;">Apply this code at checkout to save 20%.</p>
</div>`,
    },
    {
        id: 'aff-trust-badges',
        label: 'Trust Badges',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin:16px 0;padding:14px;background:#f8fafc;border-radius:12px;">
  <div style="text-align:center;min-width:110px;"><div style="font-size:22px;">🔒</div><p style="margin:4px 0 0;font-size:12px;font-weight:600;color:#334155;">Secure Checkout</p></div>
  <div style="text-align:center;min-width:110px;"><div style="font-size:22px;">↩️</div><p style="margin:4px 0 0;font-size:12px;font-weight:600;color:#334155;">30-Day Returns</p></div>
  <div style="text-align:center;min-width:110px;"><div style="font-size:22px;">✅</div><p style="margin:4px 0 0;font-size:12px;font-weight:600;color:#334155;">Verified Seller</p></div>
  <div style="text-align:center;min-width:110px;"><div style="font-size:22px;">💳</div><p style="margin:4px 0 0;font-size:12px;font-weight:600;color:#334155;">Cards Accepted</p></div>
</div>`,
    },
    {
        id: 'aff-video',
        label: 'Video Embed',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<div style="margin:16px 0;">
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;">
    <iframe src="https://www.youtube.com/embed/VIDEO_ID" title="Product video" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen loading="lazy"></iframe>
  </div>
  <p style="margin:8px 0 0;text-align:center;font-size:12px;color:#94a3b8;">Replace VIDEO_ID with your YouTube video ID.</p>
</div>`,
    },
    {
        id: 'aff-testimonial',
        label: 'Testimonial',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<figure style="max-width:560px;margin:20px auto;padding:18px 20px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;">
  <blockquote style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#581c87;">"This product exceeded my expectations. Setup took minutes and the results were noticeable within a week."</blockquote>
  <figcaption style="display:flex;align-items:center;gap:10px;">
    <img src="${IMG_PLACEHOLDER}" alt="Reviewer avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />
    <div><p style="margin:0;font-size:13px;font-weight:700;color:#581c87;">Sarah M.</p><p style="margin:0;font-size:12px;color:#a21caf;">★★★★★ Verified purchase</p></div>
  </figcaption>
</figure>`,
    },
    {
        id: 'aff-pricing',
        label: 'Pricing Card',
        category: AFFILIATE_BLOCK_CATEGORY,
        content: `<div style="max-width:420px;margin:20px auto;border:2px solid #2563eb;border-radius:14px;padding:22px;text-align:center;background:#ffffff;">
  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Best Value</p>
  <p style="margin:0 0 12px;"><span style="font-size:40px;font-weight:800;color:#1a202c;">$29</span><span style="font-size:15px;color:#64748b;"> / month</span></p>
  <ul style="margin:0 0 16px;padding:0;list-style:none;font-size:14px;color:#334155;line-height:2;">
    <li>✓ Feature one</li><li>✓ Feature two</li><li>✓ Feature three</li>
  </ul>
  <a href="#offer" style="display:block;padding:13px;background:#2563eb;color:#fff;border-radius:9px;text-decoration:none;font-weight:700;font-size:15px;">Start Now</a>
</div>`,
    },
];

/** 内置种子模板：按块 id 组合预置页面骨架，应用后可继续在画布上改内容 */
export const BUILT_IN_TEMPLATES: { name: string; blockIds: string[] }[] = [
    { name: 'Product Review', blockIds: ['aff-hero', 'aff-review-card', 'aff-pros-cons', 'aff-faq', 'aff-disclosure'] },
    { name: 'Single Offer Promo', blockIds: ['aff-hero', 'aff-image-text', 'aff-countdown', 'aff-coupon', 'aff-cta', 'aff-disclosure'] },
    { name: 'Comparison Listicle', blockIds: ['aff-hero', 'aff-comparison', 'aff-review-card', 'aff-testimonial', 'aff-cta', 'aff-disclosure'] },
    // 垂直场景包：同一使用场景内单品对比（对齐单品类选品策略）
    { name: 'Outdoor Gear Listicle', blockIds: ['aff-hero', 'aff-comparison', 'aff-image-text', 'aff-testimonial', 'aff-trust-badges', 'aff-cta', 'aff-disclosure'] },
    { name: 'Appliance Review', blockIds: ['aff-hero', 'aff-review-card', 'aff-pros-cons', 'aff-trust-badges', 'aff-faq', 'aff-cta', 'aff-disclosure'] },
    { name: 'Flash Deal Promo', blockIds: ['aff-hero', 'aff-countdown', 'aff-pricing', 'aff-coupon', 'aff-trust-badges', 'aff-cta', 'aff-disclosure'] },
];

export function buildTemplateHtml(blockIds: string[]): string {
    const byId = new Map(AFFILIATE_BLOCKS.map((block) => [block.id, block.content]));
    return blockIds.map((id) => byId.get(id) || '').filter(Boolean).join('\n');
}

/** 从完整 HTML 文档中提取可编辑片段（body 内容 + head 内 style），供画布回填编辑 */
export function extractEditableHtml(source: string): string {
    const trimmed = (source || '').trim();
    if (!trimmed || !/<(!doctype|html|body)[\s>]/i.test(trimmed)) {
        return trimmed;
    }
    const doc = new DOMParser().parseFromString(trimmed, 'text/html');
    const styleText = Array.from(doc.querySelectorAll('style'))
        .map((style) => style.textContent || '')
        .join('\n');
    const bodyHtml = doc.body ? doc.body.innerHTML : trimmed;
    return styleText ? `<style>${styleText}</style>${bodyHtml}` : bodyHtml;
}

/**
 * 深防御清洗：移除 script 标签、on* 事件属性、javascript: 协议链接
 * Why: /hosted-assets/:id/content 是公开渲染端点，入库内容必须保证无活动脚本
 */
export function sanitizeExportedHtml(html: string): string {
    if (!html || typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        return html || '';
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script').forEach((node) => node.remove());

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    const elements: Element[] = [];
    while (walker.nextNode()) {
        elements.push(walker.currentNode as Element);
    }
    for (const element of elements) {
        for (const attr of Array.from(element.attributes)) {
            const name = attr.name.toLowerCase();
            const value = attr.value.trim().toLowerCase().replace(/\s+/g, '');
            if (name.startsWith('on')) {
                element.removeAttribute(attr.name);
            } else if (
                (name === 'href' || name === 'src' || name === 'xlink:href') &&
                value.startsWith('javascript:')
            ) {
                element.removeAttribute(attr.name);
            }
        }
    }
    return doc.body.innerHTML;
}

/** 画布导出内容组装为移动优先的自包含 HTML（内联全部 CSS，无外部依赖） */
export function assembleStandaloneHtml(bodyHtml: string, css: string): string {
    const baseCss =
        '*{box-sizing:border-box}body{margin:0;padding:16px;font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;color:#1a202c;background:#ffffff;}';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${baseCss}</style>
${css ? `  <style>${css}</style>\n` : ''}</head>
<body>
${bodyHtml}
</body>
</html>`;
}
