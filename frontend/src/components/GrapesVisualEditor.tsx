/**
 * File: GrapesVisualEditor.tsx
 * Purpose: GrapesJS Visual Pro 编辑器（懒加载 default export，供 React.lazy 动态 import）
 * Why: GrapesJS 核心 ~600KB，动态分块避免污染主 bundle；storageManager 关闭，
 *      导出走 onChange 回调实时写回 localHtml 表单字段，复用现有 hosted-assets 托管链路
 *      AssetManager 直传接 /api/hosted-assets/upload mode=image（图片独立资产，不膨胀 HTML）
 *      模板库内置种子 + localStorage 持久化（单管理员场景，与 table-density 同模式）
 */

import { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import grapesjsPluginForms from 'grapesjs-plugin-forms';
import 'grapesjs/dist/css/grapes.min.css';
import {
    AFFILIATE_BLOCKS,
    BUILT_IN_TEMPLATES,
    assembleStandaloneHtml,
    buildTemplateHtml,
    extractEditableHtml,
    sanitizeExportedHtml,
} from './grapesBlocks';

const TEMPLATE_STORAGE_KEY = 'cftracking.landing-templates.v1';
const MAX_SAVED_TEMPLATES = 20;

interface SavedTemplate {
    name: string;
    html: string;
    savedAt: string;
}

function loadSavedTemplates(): SavedTemplate[] {
    try {
        const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((item) => item && typeof item.name === 'string' && typeof item.html === 'string');
    } catch {
        return [];
    }
}

function persistSavedTemplates(templates: SavedTemplate[]): void {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates.slice(0, MAX_SAVED_TEMPLATES)));
}

interface GrapesVisualEditorProps {
    /** 初始内容：可为完整 HTML 文档（自动提取 body+style）或片段 */
    initialHtml?: string;
    /** 每次画布变更后（防抖）回调自包含完整 HTML 文档 */
    onChange: (standaloneHtml: string) => void;
}

/** 直传图片压缩参数：长边上限 1600px 覆盖主流落地页展示宽度，webp q0.85 体积/画质平衡点 */
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_ENCODE_QUALITY = 0.85;
/** 压缩结果的 MIME → 服务端白名单扩展名（hostedAsset IMAGE_MIME_BY_EXT 需能按扩展名识别） */
const ENCODED_MIME_EXT: Record<string, string> = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
};

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mime, quality);
    });
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to encode blob'));
        reader.readAsDataURL(blob);
    });
}

function replaceImageExtension(fileName: string, mime: string): string {
    const ext = ENCODED_MIME_EXT[mime];
    if (!ext) {
        return fileName;
    }
    const base = fileName.replace(/\.[^.]+$/, '');
    return `${base}.${ext}`;
}

/**
 * 画布端图片压缩：长边 ≤1600px 缩放 + webp（不支持时 jpeg）重编码
 * Why: 手机拍的原图直传动辄数 MB 拖慢落地页加载；压缩结果反而更大时回退原图，
 *      GIF 跳过（canvas 会丢动画帧），解码失败回退原图交由服务端白名单把关
 */
async function compressImageForUpload(file: File): Promise<{ dataUrl: string; fileName: string }> {
    const originalDataUrl = await readFileAsDataUrl(file);
    if (file.type === 'image/gif') {
        return { dataUrl: originalDataUrl, fileName: file.name };
    }
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = () => reject(new Error(`Failed to decode ${file.name}`));
            element.src = originalDataUrl;
        });
        const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas 2D context unavailable');
        }
        ctx.drawImage(img, 0, 0, width, height);
        // webp 优先（体积最小），旧浏览器不支持 toBlob webp 时降级 jpeg（透明像素会变黑底，可接受）
        const blob = (await canvasToBlob(canvas, 'image/webp', IMAGE_ENCODE_QUALITY))
            || (await canvasToBlob(canvas, 'image/jpeg', IMAGE_ENCODE_QUALITY));
        if (!blob || !ENCODED_MIME_EXT[blob.type]) {
            throw new Error('Image encode failed');
        }
        const compressedDataUrl = await blobToDataUrl(blob);
        // 已是高压缩小图时重编码可能反而变大 → 回退原图避免无谓画质损失
        if (compressedDataUrl.length >= originalDataUrl.length) {
            return { dataUrl: originalDataUrl, fileName: file.name };
        }
        return { dataUrl: compressedDataUrl, fileName: replaceImageExtension(file.name, blob.type) };
    } catch {
        // 解码/编码失败（HEIC 等浏览器不支持格式）→ 原图直传，由服务端 MIME 白名单拒绝并给出明确错误
        return { dataUrl: originalDataUrl, fileName: file.name };
    }
}

export default function GrapesVisualEditor({ initialHtml, onChange }: GrapesVisualEditorProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<grapesjs.Editor | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
    const [templateMessage, setTemplateMessage] = useState('');

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        // 防御残留 DOM（React StrictMode 快速双挂载场景）
        container.innerHTML = '';

        const apiBase = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '';
        const editor = grapesjs.init({
            container,
            height: '560px',
            width: 'auto',
            storageManager: false,
            deviceManager: {
                devices: [
                    { id: 'desktop', name: 'Desktop', width: '' },
                    { id: 'tablet', name: 'Tablet', width: '768px', widthMedia: '992px' },
                    { id: 'mobile', name: 'Mobile', width: '390px', widthMedia: '576px' },
                ],
            },
            assetManager: {
                upload: false,
                // 自定义直传：读文件 → 画布端压缩 → base64 → hosted-assets mode=image → 返回公开 URL 加入素材库
                uploadFile: async (files: FileList) => {
                    const token = localStorage.getItem('token') || '';
                    const urls: string[] = [];
                    for (const file of Array.from(files)) {
                        const { dataUrl, fileName } = await compressImageForUpload(file);
                        const res = await fetch(`${apiBase}/api/hosted-assets/upload`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                                entityType: 'landing',
                                mode: 'image',
                                name: fileName,
                                fileName,
                                contentBase64: dataUrl,
                            }),
                        });
                        const json = await res.json().catch(() => null);
                        const url = json?.data?.publicUrl;
                        if (url) {
                            urls.push(url);
                        }
                    }
                    return urls;
                },
            },
        });
        editorRef.current = editor;

        // Forms 插件：Email Submit 类 offer 需要表单捕获，纯 HTML 组件输出无脚本（sanitize 兼容）
        editor.use(grapesjsPluginForms);

        // 挂载联盟营销块集（Affiliate 类目，与默认 Basic 类目并存）
        AFFILIATE_BLOCKS.forEach((block) => {
            editor.Blocks.add(block.id, {
                label: block.label,
                category: block.category,
                content: block.content,
            });
        });

        // 回填初始内容（localHtml 可能是 Quick 编辑器产出的完整文档）
        const seed = (initialHtml || '').trim();
        if (seed) {
            editor.setComponents(extractEditableHtml(seed));
        }

        let debounceTimer: number | undefined;
        const pushUpdate = () => {
            window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                const bodyHtml = sanitizeExportedHtml(editor.getHtml());
                const css = editor.getCss();
                onChangeRef.current(assembleStandaloneHtml(bodyHtml, css));
            }, 700);
        };
        editor.on('update', pushUpdate);

        // 调试/自动化验证钩子：暴露编辑器实例（CDP 验证与控制台排查用）
        (window as unknown as Record<string, unknown>).__gjsEditor = editor;

        return () => {
            window.clearTimeout(debounceTimer);
            delete (window as unknown as Record<string, unknown>).__gjsEditor;
            editor.destroy();
        };
        // initialHtml 仅作为首次挂载种子，后续以画布为准，避免外部写入覆盖画布
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyTemplate = (html: string, name: string) => {
        editorRef.current?.setComponents(extractEditableHtml(html));
        setTemplateMessage(`Applied template: ${name}`);
    };

    const saveCurrentAsTemplate = () => {
        const editor = editorRef.current;
        if (!editor) {
            return;
        }
        const html = assembleStandaloneHtml(sanitizeExportedHtml(editor.getHtml()), editor.getCss());
        const name = `Template ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
        const next = [{ name, html, savedAt: new Date().toISOString() }, ...loadSavedTemplates()];
        persistSavedTemplates(next);
        setSavedTemplates(next.slice(0, MAX_SAVED_TEMPLATES));
        setTemplateMessage(`Saved: ${name}`);
    };

    const deleteSavedTemplate = (savedAt: string) => {
        const next = loadSavedTemplates().filter((item) => item.savedAt !== savedAt);
        persistSavedTemplates(next);
        setSavedTemplates(next);
    };

    const showTemplates = () => {
        setSavedTemplates(loadSavedTemplates());
        setTemplateMessage('');
    };

    const barBtnClass =
        'rounded border border-border-default px-2.5 py-1 text-xs text-fg-muted hover:text-fg-default hover:border-fg-muted';

    return (
        <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
                {BUILT_IN_TEMPLATES.map((template) => (
                    <button
                        key={template.name}
                        type="button"
                        className={barBtnClass}
                        onClick={() => applyTemplate(buildTemplateHtml(template.blockIds), template.name)}
                    >
                        ⚡ {template.name}
                    </button>
                ))}
                <button type="button" className={barBtnClass} onClick={saveCurrentAsTemplate}>
                    💾 Save Current
                </button>
                <details onToggle={(event) => (event.target as HTMLDetailsElement).open && showTemplates()}>
                    <summary className={`${barBtnClass} inline-block cursor-pointer select-none`}>📁 My Templates</summary>
                    <div className="mt-1 max-h-52 w-72 overflow-auto rounded border border-border-default bg-bg-default p-2">
                        {savedTemplates.length === 0 ? (
                            <p className="m-0 p-1 text-xs text-fg-muted">No saved templates yet. Use Save Current.</p>
                        ) : (
                            savedTemplates.map((template) => (
                                <div key={template.savedAt} className="flex items-center justify-between gap-2 p-1">
                                    <button
                                        type="button"
                                        className="flex-1 truncate text-left text-xs text-fg-default hover:underline"
                                        onClick={() => applyTemplate(template.html, template.name)}
                                    >
                                        {template.name}
                                    </button>
                                    <button
                                        type="button"
                                        className="text-xs text-fg-muted hover:text-red-500"
                                        onClick={() => deleteSavedTemplate(template.savedAt)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </details>
                {templateMessage && <span className="text-xs text-fg-muted">{templateMessage}</span>}
            </div>
            <div ref={containerRef} />
        </div>
    );
}
