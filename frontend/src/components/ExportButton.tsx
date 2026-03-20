/**
 * @fileoverview Export Button Component
 * @description Reusable export button with CSV/Excel options
 * @module components/ExportButton
 */

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { exportData } from '../utils/export';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ExportButtonProps {
  data: any[];
  filename: string;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename,
  className,
  label = 'Export',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: 'csv' | 'excel') => {
    if (data.length === 0) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}_${timestamp}`;
    
    exportData(data, fullFilename, format);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || data.length === 0}
        className={cn(
          "flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest transition-colors",
          disabled || data.length === 0
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-surface-container"
        )}
      >
        <Download size={16} />
        {label}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-1 bg-surface-container-lowest border border-outline-variant shadow-lg z-50 min-w-[160px]">
            <div className="p-2 border-b border-outline-variant/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Export Format
              </span>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={() => handleExport('csv')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container transition-colors text-left"
              >
                <FileText size={16} className="text-green-600" />
                <span>Export as CSV</span>
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container transition-colors text-left"
              >
                <FileSpreadsheet size={16} className="text-blue-600" />
                <span>Export as Excel</span>
              </button>
            </div>
            <div className="p-2 border-t border-outline-variant/10">
              <div className="text-[10px] text-on-surface-variant">
                {data.length} records
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;
