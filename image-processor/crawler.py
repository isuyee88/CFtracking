"""
网页爬取模块
主要用途：使用 Playwright 爬取 Keitaro 文档网站，下载所有截图
输入：文档 URL
输出：下载的图片文件和基本元数据
"""

import asyncio
import hashlib
import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright, Browser, Page

import config
from models import ImageIndexEntry


class KeitaroCrawler:
    def __init__(self):
        self.base_url = config.KEITARO_DOCS_BASE_URL
        self.raw_dir = config.RAW_DIR
        self.visited_urls = set()
        self.downloaded_images = []
    
    async def crawl(self, start_url: Optional[str] = None):
        if start_url is None:
            start_url = self.base_url
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        session_dir = self.raw_dir / timestamp
        session_dir.mkdir(parents=True, exist_ok=True)
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            await self._crawl_page(page, start_url, session_dir, timestamp)
            
            await browser.close()
        
        return self.downloaded_images
    
    async def _crawl_page(self, page: Page, url: str, session_dir: Path, timestamp: str):
        if url in self.visited_urls:
            return
        
        self.visited_urls.add(url)
        print(f"爬取页面: {url}")
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)
            
            images = await self._extract_images(page, url, session_dir, timestamp)
            self.downloaded_images.extend(images)
            
            links = await self._extract_links(page, url)
            
            for link in links:
                if link not in self.visited_urls:
                    await self._crawl_page(page, link, session_dir, timestamp)
        
        except Exception as e:
            print(f"爬取页面失败 {url}: {e}")
    
    async def _extract_images(self, page: Page, page_url: str, session_dir: Path, timestamp: str) -> List[ImageIndexEntry]:
        images = []
        
        img_elements = await page.query_selector_all("img")
        
        for idx, img in enumerate(img_elements):
            try:
                src = await img.get_attribute("src")
                if not src:
                    continue
                
                img_url = urljoin(page_url, src)
                
                img_ext = self._get_image_extension(img_url)
                if not img_ext:
                    continue
                
                img_id = hashlib.md5(img_url.encode()).hexdigest()[:12]
                filename = f"img_{img_id}{img_ext}"
                filepath = session_dir / filename
                
                await self._download_image(page, img_url, filepath)
                
                if filepath.exists():
                    file_size = filepath.stat().st_size
                    
                    entry = ImageIndexEntry(
                        id=f"img_{img_id}",
                        source_url=img_url,
                        original_filename=Path(urlparse(img_url).path).name or filename,
                        category="other",
                        file_path=str(filepath.relative_to(config.BASE_DIR)),
                        file_size=file_size,
                        width=0,
                        height=0,
                        format=img_ext.lstrip("."),
                        crawl_timestamp=datetime.now(),
                        last_updated=datetime.now(),
                        description_file=str(config.DESCRIPTIONS_DIR / f"{img_id}.json"),
                        tags=[]
                    )
                    images.append(entry)
                    print(f"  下载图片: {img_url} -> {filename}")
            
            except Exception as e:
                print(f"  处理图片失败: {e}")
        
        return images
    
    async def _download_image(self, page: Page, img_url: str, filepath: Path):
        try:
            async with page.context.expect_page() as new_page_info:
                pass
            
            download_page = await page.context.new_page()
            await download_page.goto(img_url, timeout=15000)
            
            await asyncio.sleep(1)
            
            img_data = await download_page.screenshot(full_page=False)
            
            with open(filepath, "wb") as f:
                f.write(img_data)
            
            await download_page.close()
        
        except Exception:
            import requests
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            r = requests.get(img_url, headers=headers, timeout=15)
            r.raise_for_status()
            with open(filepath, "wb") as f:
                f.write(r.content)
    
    async def _extract_links(self, page: Page, page_url: str) -> List[str]:
        links = []
        
        a_elements = await page.query_selector_all("a[href]")
        
        for a in a_elements:
            try:
                href = await a.get_attribute("href")
                if not href:
                    continue
                
                full_url = urljoin(page_url, href)
                
                parsed = urlparse(full_url)
                
                if parsed.netloc != urlparse(self.base_url).netloc:
                    continue
                
                if parsed.fragment:
                    full_url = full_url.split("#")[0]
                
                if full_url not in links:
                    links.append(full_url)
            
            except Exception:
                pass
        
        return links
    
    def _get_image_extension(self, url: str) -> Optional[str]:
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]:
            if path.endswith(ext):
                return ext
        
        return ".png"
