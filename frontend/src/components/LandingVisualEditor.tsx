/**
 * @fileoverview 着陆页可视化编辑器
 * @description 结构化字段（Hero/段落/图片/CTA/主题色）+ 实时 iframe 预览 + 生成响应式 HTML。
 *              生成的 HTML 交由 Landings 表单的 localHtml 链路（uploadHostedAsset → hosted-assets 渲染），
 *              本组件不直接调用后端，保持与现有托管渲染/跟踪链路零耦合。
 * @module components/LandingVisualEditor
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Code2, Plus, Trash2 } from 'lucide-react';

interface CtaButton {
  text: string;
  url: string;
}

export interface VisualLandingContent {
  pageTitle: string;
  heroHeadline: string;
  heroSubheadline: string;
  paragraphs: string[];
  imageUrls: string[];
  ctas: CtaButton[];
  accentColor: string;
  disclosure: string;
}

export const EMPTY_VISUAL_CONTENT: VisualLandingContent = {
  pageTitle: 'My Landing Page',
  heroHeadline: 'Headline That Sells',
  heroSubheadline: 'A short supporting line under the headline.',
  paragraphs: ['Explain the value proposition in one short paragraph.'],
  imageUrls: [],
  ctas: [{ text: 'Get Started', url: '' }],
  accentColor: '#2563eb',
  disclosure: '',
};

const ACCENT_PRESETS = ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0891b2'];

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ');
}

/** 编辑器输出的所有内容统一转义，防止生成的 HTML 被注入 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 仅接受 http(s) 绝对地址或站内相对路径，阻断 javascript: 等危险 scheme */
function sanitizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function safeImageSrc(value: string): string {
  const url = sanitizeUrl(value);
  return /^https?:\/\//i.test(url) ? url : '';
}

/** 结构化内容 → 完整响应式 HTML（移动优先，内联 CSS，无外部依赖） */
export function buildVisualLandingHtml(content: VisualLandingContent): string {
  const accent = /^#[0-9a-fA-F]{6}$/.test(content.accentColor) ? content.accentColor : '#2563eb';
  const title = escapeHtml(content.pageTitle || 'Landing Page');
  const headline = escapeHtml(content.heroHeadline);
  const sub = escapeHtml(content.heroSubheadline);
  const paragraphs = content.paragraphs
    .filter((item) => item.trim())
    .map((item) => `<p>${escapeHtml(item)}</p>`)
    .join('\n            ');
  const images = content.imageUrls
    .map((item) => safeImageSrc(item))
    .filter(Boolean)
    .map((src) => `<img src="${escapeHtml(src)}" alt="" loading="lazy" />`)
    .join('\n            ');
  const ctas = content.ctas
    .filter((item) => item.text.trim() && item.url.trim())
    .map(
      (item) =>
        `<a class="cta" href="${escapeHtml(sanitizeUrl(item.url))}" rel="nofollow noopener">${escapeHtml(item.text)}</a>`
    )
    .join('\n            ');
  const disclosure = content.disclosure.trim()
    ? `<p class="disclosure">${escapeHtml(content.disclosure)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; background: #ffffff; line-height: 1.6; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 2rem; line-height: 1.25; margin-bottom: 12px; }
  .sub { font-size: 1.125rem; color: #4b5563; margin-bottom: 24px; }
  .hero-img { width: 100%; border-radius: 12px; display: block; margin: 0 0 24px; }
  .gallery img { width: 100%; border-radius: 12px; display: block; margin-bottom: 16px; }
  p.body { margin-bottom: 16px; font-size: 1rem; }
  .ctas { display: flex; flex-direction: column; gap: 12px; margin: 28px 0 8px; }
  .cta { display: block; text-align: center; background: ${accent}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 1.0625rem; padding: 15px 20px; border-radius: 10px; }
  .cta:active { opacity: 0.85; }
  .disclosure { font-size: 0.75rem; color: #6b7280; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
  @media (min-width: 640px) {
    h1 { font-size: 2.5rem; }
    .ctas { flex-direction: row; }
    .cta { flex: 1; }
  }
</style>
</head>
<body>
  <main class="wrap">
            ${headline ? `<h1>${headline}</h1>` : ''}
            ${sub ? `<p class="sub">${sub}</p>` : ''}
            ${images ? `<div class="gallery">\n            ${images}\n            </div>` : ''}
            ${paragraphs}
            ${ctas ? `<div class="ctas">\n            ${ctas}\n            </div>` : ''}
            ${disclosure}
  </main>
</body>
</html>
`;
}

const inputClass =
  'w-full bg-surface-container border border-border-default rounded px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg';
const labelClass = 'block text-xs font-medium text-fg-muted mb-1';

function Label({ text, htmlFor }: { text: string; htmlFor?: string }) {
  return (
    <label className={labelClass} htmlFor={htmlFor}>
      {text}
    </label>
  );
}

export function LandingVisualEditor({
  value,
  onChange,
}: {
  value: VisualLandingContent;
  onChange: (next: VisualLandingContent) => void;
}) {
  const [mode, setMode] = useState<'visual' | 'preview'>('visual');
  const [previewDoc, setPreviewDoc] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 预览文档 300ms 防抖写入 iframe，避免每次按键全量重渲染
  useEffect(() => {
    if (mode !== 'preview') {
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setPreviewDoc(buildVisualLandingHtml(value));
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [mode, value]);

  const patch = useCallback(
    (partial: Partial<VisualLandingContent>) => {
      onChange({ ...value, ...partial });
    },
    [onChange, value]
  );

  const generatedHtml = useMemo(() => buildVisualLandingHtml(value), [value]);

  return (
    <div className="border border-border-default rounded overflow-hidden">
      <div className="flex items-center justify-between bg-surface-container px-3 py-2">
        <div className="flex overflow-hidden rounded border border-border-default">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium',
              mode === 'visual' ? 'bg-accent-fg text-surface' : 'bg-surface text-fg-muted'
            )}
          >
            <Code2 size={13} className="inline mr-1" />
            Visual
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium',
              mode === 'preview' ? 'bg-accent-fg text-surface' : 'bg-surface text-fg-muted'
            )}
          >
            <Eye size={13} className="inline mr-1" />
            Preview
          </button>
        </div>
        <span className="text-[11px] text-fg-muted">Generates the Local HTML saved with this landing page</span>
      </div>

      {mode === 'visual' ? (
        <div className="space-y-4 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label text="Page Title (browser tab)" htmlFor="lve-page-title" />
              <input
                id="lve-page-title"
                type="text"
                className={inputClass}
                value={value.pageTitle}
                onChange={(event) => patch({ pageTitle: event.target.value })}
              />
            </div>
            <div>
              <Label text="Accent Color" htmlFor="lve-accent" />
              <div className="flex items-center gap-2">
                <input
                  id="lve-accent"
                  type="color"
                  className="h-9 w-12 cursor-pointer rounded border border-border-default bg-surface-container"
                  value={value.accentColor}
                  onChange={(event) => patch({ accentColor: event.target.value })}
                />
                <div className="flex gap-1">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => patch({ accentColor: preset })}
                      className="h-6 w-6 rounded border border-border-default"
                      style={{ backgroundColor: preset }}
                      aria-label={`Use accent color ${preset}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label text="Hero Headline" htmlFor="lve-headline" />
            <input
              id="lve-headline"
              type="text"
              className={inputClass}
              value={value.heroHeadline}
              onChange={(event) => patch({ heroHeadline: event.target.value })}
            />
          </div>

          <div>
            <Label text="Hero Subheadline" htmlFor="lve-sub" />
            <input
              id="lve-sub"
              type="text"
              className={inputClass}
              value={value.heroSubheadline}
              onChange={(event) => patch({ heroSubheadline: event.target.value })}
            />
          </div>

          <div>
            <Label text="Images (image URLs, first one shown after hero)" />
            <div className="space-y-2">
              {value.imageUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="https://example.com/image.jpg"
                    value={url}
                    onChange={(event) => {
                      const next = [...value.imageUrls];
                      next[index] = event.target.value;
                      patch({ imageUrls: next });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => patch({ imageUrls: value.imageUrls.filter((_, i) => i !== index) })}
                    className="rounded border border-border-default px-2 text-fg-muted hover:text-error"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => patch({ imageUrls: [...value.imageUrls, ''] })}
                className="inline-flex items-center gap-1 rounded border border-border-default px-2 py-1 text-xs text-fg-muted hover:text-fg-default"
              >
                <Plus size={12} /> Add image URL
              </button>
            </div>
          </div>

          <div>
            <Label text="Body Paragraphs" />
            <div className="space-y-2">
              {value.paragraphs.map((text, index) => (
                <div key={index} className="flex gap-2">
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={text}
                    onChange={(event) => {
                      const next = [...value.paragraphs];
                      next[index] = event.target.value;
                      patch({ paragraphs: next });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => patch({ paragraphs: value.paragraphs.filter((_, i) => i !== index) })}
                    className="rounded border border-border-default px-2 text-fg-muted hover:text-error"
                    aria-label={`Remove paragraph ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => patch({ paragraphs: [...value.paragraphs, ''] })}
                className="inline-flex items-center gap-1 rounded border border-border-default px-2 py-1 text-xs text-fg-muted hover:text-fg-default"
              >
                <Plus size={12} /> Add paragraph
              </button>
            </div>
          </div>

          <div>
            <Label text="CTA Buttons (text + link; use your campaign/offer tracking URL)" />
            <div className="space-y-2">
              {value.ctas.map((cta, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className={inputClass}
                    style={{ flex: '0 0 38%' }}
                    placeholder="Button text"
                    value={cta.text}
                    onChange={(event) => {
                      const next = [...value.ctas];
                      next[index] = { ...next[index], text: event.target.value };
                      patch({ ctas: next });
                    }}
                  />
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="https://tracking-domain/click..."
                    value={cta.url}
                    onChange={(event) => {
                      const next = [...value.ctas];
                      next[index] = { ...next[index], url: event.target.value };
                      patch({ ctas: next });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => patch({ ctas: value.ctas.filter((_, i) => i !== index) })}
                    className="rounded border border-border-default px-2 text-fg-muted hover:text-error"
                    aria-label={`Remove CTA ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => patch({ ctas: [...value.ctas, { text: '', url: '' }] })}
                className="inline-flex items-center gap-1 rounded border border-border-default px-2 py-1 text-xs text-fg-muted hover:text-fg-default"
              >
                <Plus size={12} /> Add CTA button
              </button>
            </div>
          </div>

          <div>
            <Label text="FTC / Affiliate Disclosure (optional, shown at bottom)" htmlFor="lve-disclosure" />
            <textarea
              id="lve-disclosure"
              rows={2}
              className={inputClass}
              placeholder="Disclosure: We may earn a commission from links on this page."
              value={value.disclosure}
              onChange={(event) => patch({ disclosure: event.target.value })}
            />
          </div>
        </div>
      ) : (
        <iframe
          title="Landing page preview"
          className="h-[520px] w-full bg-white"
          sandbox="allow-same-origin"
          srcDoc={previewDoc || generatedHtml}
        />
      )}
    </div>
  );
}

const HEX_COLOR_RE = /#[0-9a-f]{6}\b/i;

/**
 * Pro→Quick 反向解析：从已有 HTML 提取结构化字段（启发式）。
 * Why: 用户先在 Pro Studio/外部工具做好页面后，希望切回 Quick 表单继续微调；
 *      HTML 结构不可枚举，采用置信度门槛：无 h1 且无有效链接视为不可解析返回 null，
 *      调用方据 null 跳过覆盖，避免把不相关 HTML 误转成空壳结构
 */
export function parseVisualLandingHtml(source: string): VisualLandingContent | null {
  const raw = (source || '').trim();
  if (!raw || typeof DOMParser === 'undefined') {
    return null;
  }
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const body = doc.body;
  if (!body) {
    return null;
  }

  const headline = body.querySelector('h1')?.textContent?.trim() || '';
  const links = Array.from(body.querySelectorAll('a[href]')).filter((a) => {
    const href = a.getAttribute('href') || '';
    const text = (a.textContent || '').trim();
    return Boolean(href) && !href.startsWith('#') && text.length > 0 && text.length <= 60;
  });
  if (!headline && links.length === 0) {
    return null;
  }

  const paragraphsAll = Array.from(body.querySelectorAll('p'))
    .map((p) => (p.textContent || '').trim())
    .filter(Boolean);

  // 副标题：h1 后最近的段落；否则回退首段
  const h1 = body.querySelector('h1');
  let heroSub = '';
  let paragraphs = paragraphsAll;
  if (h1) {
    let cursor = h1.nextElementSibling;
    while (cursor && cursor.tagName !== 'P') {
      cursor = cursor.nextElementSibling;
    }
    if (cursor?.tagName === 'P') {
      heroSub = (cursor.textContent || '').trim();
      paragraphs = paragraphs.filter((text) => text !== heroSub);
    }
  }
  if (!heroSub) {
    heroSub = paragraphs.shift() || '';
  }

  // 图片：仅收外链/相对路径；data: URI 过大不回填
  const imageUrls = Array.from(body.querySelectorAll('img'))
    .map((img) => img.getAttribute('src') || '')
    .filter((src) => src && !src.startsWith('data:'))
    .slice(0, 8);

  const ctas = links.slice(0, 4).map((a) => ({
    text: (a.textContent || '').trim().slice(0, 60),
    url: a.getAttribute('href') || '',
  }));

  // 主题色：取第一个 CTA 内联背景色，回退默认
  const accentColor =
    (links[0]?.getAttribute('style') || '').match(HEX_COLOR_RE)?.[0] || EMPTY_VISUAL_CONTENT.accentColor;

  // FTC 披露：文案含 affiliate/commission/disclosure 的段落，单独提出不进正文
  const disclosure =
    paragraphs.find((text) => /affiliate|commission|disclosure/i.test(text)) || EMPTY_VISUAL_CONTENT.disclosure;
  paragraphs = paragraphs.filter((text) => text !== disclosure);

  return {
    pageTitle: doc.title?.trim() || headline || EMPTY_VISUAL_CONTENT.pageTitle,
    heroHeadline: headline || EMPTY_VISUAL_CONTENT.heroHeadline,
    heroSubheadline: heroSub,
    paragraphs: paragraphs.slice(0, 6),
    imageUrls,
    ctas,
    accentColor,
    disclosure,
  };
}
