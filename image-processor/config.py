"""
配置文件
主要用途：存储项目配置常量、路径配置、API配置等
输入输出：无，供其他模块导入使用
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent.parent
KEITARO_IMAGES_DIR = BASE_DIR / "keitaro-images"
RAW_DIR = KEITARO_IMAGES_DIR / "raw"
CATEGORIZED_DIR = KEITARO_IMAGES_DIR / "categorized"
METADATA_DIR = KEITARO_IMAGES_DIR / "metadata"
DESCRIPTIONS_DIR = METADATA_DIR / "descriptions"

IMAGES_INDEX_FILE = METADATA_DIR / "images.json"

KEITARO_DOCS_BASE_URL = "https://docs.keitaro.io"

CATEGORIES = [
    "installation",
    "dashboard",
    "campaign-management",
    "offer-management",
    "landing-page-management",
    "flow-management",
    "rule-management",
    "payment-integration",
    "api-documentation",
    "settings",
    "other"
]

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

DEFAULT_MODEL = "gpt-4-vision-preview"

MAX_RETRIES = 3
REQUEST_TIMEOUT = 60
