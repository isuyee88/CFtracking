"""
数据模型定义
主要用途：定义结构化描述的 Pydantic 模型，确保数据格式正确
输入输出：用于验证和生成 JSON 数据
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class UIElement(BaseModel):
    id: str
    type: str
    label: Optional[str] = None
    placeholder: Optional[str] = None
    options: Optional[List[str]] = None
    selected_option: Optional[str] = None
    bounding_box: BoundingBox
    text_content: Optional[str] = None
    is_primary: bool = False
    is_interactive: bool = True
    headers: Optional[List[str]] = None
    rows: Optional[int] = None
    columns: Optional[int] = None


class TextSection(BaseModel):
    heading: str
    content: str
    position: BoundingBox


class TextContent(BaseModel):
    full_text: str
    sections: List[TextSection]
    key_phrases: List[str]


class WorkflowStep(BaseModel):
    step: int
    action: str
    element_id: Optional[str] = None


class FunctionalDescription(BaseModel):
    primary_function: str
    user_goal: str
    workflow_steps: List[WorkflowStep]
    data_displayed: List[str]
    critical_elements: List[str]


class ContextualInfo(BaseModel):
    related_pages: List[str]
    parent_section: str
    documentation_path: str
    keywords: List[str]


class AnalysisConfidence(BaseModel):
    ui_detection: float
    ocr_accuracy: float
    functional_understanding: float
    overall: float


class BasicInfo(BaseModel):
    category: str
    subcategory: Optional[str] = None
    page_title: str
    language: str = "en"


class ImageDescription(BaseModel):
    image_id: str
    version: str = "1.0"
    generated_at: datetime
    model_used: str
    
    basic_info: BasicInfo
    ui_elements: List[UIElement]
    text_content: TextContent
    functional_description: FunctionalDescription
    contextual_info: ContextualInfo
    analysis_confidence: AnalysisConfidence


class ImageIndexEntry(BaseModel):
    id: str
    source_url: str
    original_filename: str
    category: str
    subcategory: Optional[str] = None
    file_path: str
    file_size: int
    width: int
    height: int
    format: str
    crawl_timestamp: datetime
    last_updated: datetime
    description_file: str
    tags: List[str]


class ImageIndex(BaseModel):
    version: str = "1.0"
    images: List[ImageIndexEntry] = Field(default_factory=list)
