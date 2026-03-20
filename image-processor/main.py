"""
主程序入口
主要用途：协调整个处理流程：爬取 -> 分类 -> 分析 -> 存储
输入：命令行参数
输出：处理后的图像和结构化描述
"""

import asyncio
import os
from pathlib import Path
from datetime import datetime

import config
from crawler import KeitaroCrawler
from storage import StorageManager
from analyzer import ImageAnalyzer


async def main():
    print("=" * 60)
    print("Keitaro 文档截图处理系统")
    print("=" * 60)
    
    storage = StorageManager()
    
    print("\n[1/4] 开始爬取 Keitaro 文档...")
    crawler = KeitaroCrawler()
    images = await crawler.crawl()
    
    if not images:
        print("未找到任何图片，退出。")
        return
    
    print(f"\n成功下载 {len(images)} 张图片")
    
    print("\n[2/4] 保存图片索引...")
    storage.add_images_to_index(images)
    print(f"索引已保存到 {config.IMAGES_INDEX_FILE}")
    
    if not config.OPENAI_API_KEY:
        print("\n警告: 未设置 OPENAI_API_KEY，跳过图像分析步骤")
        print("\n处理完成！图片已保存到 keitaro-images/raw/ 目录")
        return
    
    print("\n[3/4] 开始图像分析...")
    analyzer = ImageAnalyzer()
    
    for idx, img_entry in enumerate(images, 1):
        print(f"\n处理图片 {idx}/{len(images)}: {img_entry.id}")
        
        img_path = config.BASE_DIR / img_entry.file_path
        
        if not img_path.exists():
            print(f"  跳过：文件不存在 {img_path}")
            continue
        
        try:
            print(f"  分析中...")
            description = analyzer.analyze_image(
                img_path, 
                img_entry.id,
                page_context=f"Source URL: {img_entry.source_url}"
            )
            
            description["image_id"] = img_entry.id
            description["generated_at"] = datetime.now().isoformat()
            description["model_used"] = analyzer.model
            
            print(f"  保存描述...")
            storage.save_description(img_entry.id, description)
            
            category = description.get("basic_info", {}).get("category", "other")
            subcategory = description.get("basic_info", {}).get("subcategory")
            
            print(f"  分类: {category}" + (f" / {subcategory}" if subcategory else ""))
            storage.categorize_image(img_entry.id, category, subcategory)
            
            print(f"  ✓ 完成")
            
        except Exception as e:
            print(f"  ✗ 处理失败: {e}")
    
    print("\n[4/4] 处理完成！")
    print("=" * 60)
    print(f"原始图片: keitaro-images/raw/")
    print(f"分类图片: keitaro-images/categorized/")
    print(f"描述文件: keitaro-images/metadata/descriptions/")
    print(f"索引文件: {config.IMAGES_INDEX_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
