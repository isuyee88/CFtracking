"""
存储管理模块
主要用途：管理图像索引、分类移动、JSON 文件读写
输入：图像元数据、分类信息
输出：更新后的索引文件、移动后的图像
"""

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import config
from models import ImageIndex, ImageIndexEntry


class StorageManager:
    def __init__(self):
        self.index_file = config.IMAGES_INDEX_FILE
        self.categorized_dir = config.CATEGORIZED_DIR
        self.descriptions_dir = config.DESCRIPTIONS_DIR
        
        self.categorized_dir.mkdir(parents=True, exist_ok=True)
        self.descriptions_dir.mkdir(parents=True, exist_ok=True)
        
        for category in config.CATEGORIES:
            (self.categorized_dir / category).mkdir(exist_ok=True)
    
    def load_index(self) -> ImageIndex:
        if self.index_file.exists():
            with open(self.index_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return ImageIndex(**data)
        return ImageIndex()
    
    def save_index(self, index: ImageIndex):
        with open(self.index_file, "w", encoding="utf-8") as f:
            json.dump(index.model_dump(mode="json"), f, indent=2, ensure_ascii=False)
    
    def add_images_to_index(self, images: List[ImageIndexEntry]):
        index = self.load_index()
        
        existing_ids = {img.id for img in index.images}
        
        for img in images:
            if img.id not in existing_ids:
                index.images.append(img)
        
        self.save_index(index)
        return index
    
    def categorize_image(self, image_id: str, category: str, subcategory: Optional[str] = None) -> Optional[ImageIndexEntry]:
        index = self.load_index()
        
        img_entry = None
        for img in index.images:
            if img.id == image_id:
                img_entry = img
                break
        
        if not img_entry:
            return None
        
        if category not in config.CATEGORIES:
            category = "other"
        
        img_entry.category = category
        img_entry.subcategory = subcategory
        img_entry.last_updated = datetime.now()
        
        old_path = config.BASE_DIR / img_entry.file_path
        
        if old_path.exists():
            target_dir = self.categorized_dir / category
            if subcategory:
                target_dir = target_dir / subcategory
                target_dir.mkdir(exist_ok=True)
            
            new_path = target_dir / old_path.name
            shutil.move(str(old_path), str(new_path))
            
            img_entry.file_path = str(new_path.relative_to(config.BASE_DIR))
        
        self.save_index(index)
        return img_entry
    
    def save_description(self, image_id: str, description: dict):
        desc_file = self.descriptions_dir / f"{image_id}.json"
        with open(desc_file, "w", encoding="utf-8") as f:
            json.dump(description, f, indent=2, ensure_ascii=False)
        return str(desc_file)
    
    def load_description(self, image_id: str) -> Optional[dict]:
        desc_file = self.descriptions_dir / f"{image_id}.json"
        if desc_file.exists():
            with open(desc_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return None
    
    def get_image_by_id(self, image_id: str) -> Optional[ImageIndexEntry]:
        index = self.load_index()
        for img in index.images:
            if img.id == image_id:
                return img
        return None
    
    def get_images_by_category(self, category: str) -> List[ImageIndexEntry]:
        index = self.load_index()
        return [img for img in index.images if img.category == category]
