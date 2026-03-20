"""
图像分析模块
主要用途：使用视觉语言模型分析图像，生成结构化描述
输入：图像文件路径
输出：结构化描述数据（UI元素、OCR文本、功能描述等）
"""

import base64
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

import openai

import config


class ImageAnalyzer:
    def __init__(self, api_key: Optional[str] = None, model: str = None):
        self.api_key = api_key or config.OPENAI_API_KEY
        self.model = model or config.DEFAULT_MODEL
        self.client = openai.OpenAI(api_key=self.api_key)
    
    def encode_image(self, image_path: Path) -> str:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")
    
    def analyze_image(self, image_path: Path, image_id: str, page_context: Optional[str] = None) -> Dict[str, Any]:
        base64_image = self.encode_image(image_path)
        
        prompt = self._build_prompt(page_context)
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=4096,
            temperature=0.1
        )
        
        result_text = response.choices[0].message.content
        
        try:
            result = self._parse_json_response(result_text)
        except Exception:
            result = self._create_fallback_description(result_text, image_id)
        
        return result
    
    def _build_prompt(self, page_context: Optional[str] = None) -> str:
        context_note = ""
        if page_context:
            context_note = f"\nAdditional context from the documentation page:\n{page_context}\n"
        
        return f"""You are an expert UI/UX analyst analyzing screenshots from the Keitaro tracker documentation.

{context_note}

Analyze this image and return a JSON response with the following structure:

{{
  "basic_info": {{
    "category": "one of: installation, dashboard, campaign-management, offer-management, landing-page-management, flow-management, rule-management, payment-integration, api-documentation, settings, other",
    "subcategory": "optional subcategory name",
    "page_title": "the title or main heading visible in the image",
    "language": "en"
  }},
  "ui_elements": [
    {{
      "id": "elem_001",
      "type": "button|input|dropdown|checkbox|radio|tab|table|chart|navbar|sidebar|modal|alert|card|list|menu|link|heading|paragraph|other",
      "label": "text on the element",
      "placeholder": "placeholder text if input",
      "options": ["option1", "option2"],
      "selected_option": "selected value if dropdown/radio",
      "bounding_box": {{
        "x": 100,
        "y": 200,
        "width": 200,
        "height": 50
      }},
      "text_content": "full text content",
      "is_primary": true/false,
      "is_interactive": true/false,
      "headers": ["col1", "col2"],
      "rows": 5,
      "columns": 3
    }}
  ],
  "text_content": {{
    "full_text": "all visible text combined",
    "sections": [
      {{
        "heading": "section heading",
        "content": "section content",
        "position": {{"x": 100, "y": 200, "width": 400, "height": 100}}
      }}
    ],
    "key_phrases": ["important phrase 1", "important phrase 2"]
  }},
  "functional_description": {{
    "primary_function": "what this interface does",
    "user_goal": "what the user is trying to achieve",
    "workflow_steps": [
      {{
        "step": 1,
        "action": "what the user does",
        "element_id": "elem_001"
      }}
    ],
    "data_displayed": ["data item 1", "data item 2"],
    "critical_elements": ["elem_001", "elem_002"]
  }},
  "contextual_info": {{
    "related_pages": ["Related Page 1", "Related Page 2"],
    "parent_section": "Parent Section Name",
    "documentation_path": "/en/some/path",
    "keywords": ["keyword1", "keyword2"]
  }},
  "analysis_confidence": {{
    "ui_detection": 0.90,
    "ocr_accuracy": 0.95,
    "functional_understanding": 0.85,
    "overall": 0.90
  }}
}}

Important:
- Return ONLY valid JSON, no markdown or extra text
- Estimate bounding boxes reasonably (use x, y from top-left)
- Identify at least the main interactive elements
- Extract all visible text
- Describe the workflow clearly
- Category must be one of the specified options
"""
    
    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        text = text.strip()
        
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        text = text.strip()
        
        return json.loads(text)
    
    def _create_fallback_description(self, text: str, image_id: str) -> Dict[str, Any]:
        return {
            "image_id": image_id,
            "version": "1.0",
            "generated_at": datetime.now().isoformat(),
            "model_used": self.model,
            "basic_info": {
                "category": "other",
                "page_title": "Unidentified Page",
                "language": "en"
            },
            "ui_elements": [],
            "text_content": {
                "full_text": text[:2000] if text else "",
                "sections": [],
                "key_phrases": []
            },
            "functional_description": {
                "primary_function": "Could not determine function automatically",
                "user_goal": "Unknown",
                "workflow_steps": [],
                "data_displayed": [],
                "critical_elements": []
            },
            "contextual_info": {
                "related_pages": [],
                "parent_section": "Unknown",
                "documentation_path": "",
                "keywords": []
            },
            "analysis_confidence": {
                "ui_detection": 0.0,
                "ocr_accuracy": 0.0,
                "functional_understanding": 0.0,
                "overall": 0.0
            }
        }
