/**
 * File: HelpCenter.tsx
 * Purpose: Help Center 页面，提供帮助文档和FAQ
 * Input/Output: 显示帮助文章列表，支持搜索和分类
 * Logic: 帮助中心，包括文档、FAQ、联系支持
 */

import React, { useState } from 'react';
import { HelpCircle, Search, Book, MessageCircle, FileText, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  lastUpdated: string;
}

const helpArticles: HelpArticle[] = [
  {
    id: '1',
    title: 'Getting Started with CFTracking',
    category: 'Quick Start',
    content: 'Learn how to set up your first campaign and start tracking clicks.',
    lastUpdated: '2024-01-15'
  },
  {
    id: '2',
    title: 'Understanding Campaign Structure',
    category: 'Campaigns',
    content: 'Learn about campaigns, landings, offers, and how they work together.',
    lastUpdated: '2024-01-16'
  },
  {
    id: '3',
    title: 'Setting Up Traffic Sources',
    category: 'Traffic Sources',
    content: 'Configure your traffic sources to start receiving traffic.',
    lastUpdated: '2024-01-19'
  },
  {
    id: '6',
    title: 'API Integration',
    category: 'Advanced',
    content: 'Integrate CFTracking with your existing systems using our API.',
    lastUpdated: '2024-01-20'
  }
];

const categories = ['All', 'Quick Start', 'Campaigns', 'Traffic Sources', 'Features', 'Advanced'];

export const HelpCenter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredArticles = helpArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg-default flex items-center gap-2">
          <HelpCircle size={28} />
          Help Center
        </h1>
        <p className="text-fg-muted mt-1">Find answers and learn how to use CFTracking</p>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search help articles..."
            className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              'px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors rounded-md',
              selectedCategory === category
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-fg-default hover:bg-surface-container-high'
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 hover:bg-surface-container-high transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Book size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-fg-default">Documentation</h3>
              <p className="text-sm text-fg-muted">Read the full docs</p>
            </div>
          </div>
        </div>
        <div className="card p-4 hover:bg-surface-container-high transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageCircle size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-fg-default">Support</h3>
              <p className="text-sm text-fg-muted">Contact our team</p>
            </div>
          </div>
        </div>
        <div className="card p-4 hover:bg-surface-container-high transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-fg-default">FAQ</h3>
              <p className="text-sm text-fg-muted">Common questions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Articles List */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-outline-variant">
          <h2 className="font-medium text-fg-default">Articles</h2>
        </div>
        <div className="divide-y divide-outline-variant">
          {filteredArticles.map(article => (
            <div
              key={article.id}
              className="p-4 hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-primary">{article.category}</span>
                  </div>
                  <h3 className="font-medium text-fg-default mb-1">{article.title}</h3>
                  <p className="text-sm text-fg-muted">{article.content}</p>
                </div>
                <ChevronRight size={20} className="text-fg-muted" />
              </div>
            </div>
          ))}
          {filteredArticles.length === 0 && (
            <div className="p-8 text-center text-fg-muted">
              No articles found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
