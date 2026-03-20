/**
 * @fileoverview Timezone Selector Component
 * @description Timezone selection dropdown with automatic detection
 * @module components/TimezoneSelector
 */

import React, { useState, useEffect } from 'react';
import { Globe, Clock, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TIMEZONES, getLocalTimezone, getStoredTimezone, storeTimezone } from '../utils/timezone';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TimezoneSelectorProps {
  value?: string;
  onChange?: (timezone: string) => void;
  className?: string;
  showLabel?: boolean;
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  value,
  onChange,
  className,
  showLabel = true,
}) => {
  const [selectedTimezone, setSelectedTimezone] = useState(value || getStoredTimezone());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (value && value !== selectedTimezone) {
      setSelectedTimezone(value);
    }
  }, [value]);

  const handleSelect = (timezone: string) => {
    setSelectedTimezone(timezone);
    storeTimezone(timezone);
    onChange?.(timezone);
    setIsOpen(false);
  };

  const currentTimezone = TIMEZONES.find(tz => tz.value === selectedTimezone);
  const localTimezone = getLocalTimezone();

  return (
    <div className={cn("relative", className)}>
      {showLabel && (
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Timezone
        </label>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface border border-outline-variant text-sm hover:border-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-on-surface-variant" />
          <span className="text-on-surface">
            {currentTimezone?.label || selectedTimezone}
          </span>
        </div>
        <Clock size={14} className="text-on-surface-variant" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant shadow-lg z-50 max-h-80 overflow-y-auto">
            {/* Auto-detect option */}
            <div className="p-2 border-b border-outline-variant/10">
              <button
                onClick={() => handleSelect(localTimezone)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container transition-colors",
                  selectedTimezone === localTimezone && "bg-primary/10 text-primary"
                )}
              >
                <Globe size={16} />
                <span className="flex-1 text-left">Auto-detect ({localTimezone})</span>
                {selectedTimezone === localTimezone && <Check size={14} />}
              </button>
            </div>

            {/* Timezone list */}
            <div className="p-2">
              {TIMEZONES.map((timezone) => (
                <button
                  key={timezone.value}
                  onClick={() => handleSelect(timezone.value)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container transition-colors rounded-sm",
                    selectedTimezone === timezone.value && "bg-primary/10 text-primary"
                  )}
                >
                  <Clock size={14} className="text-on-surface-variant" />
                  <span className="flex-1 text-left">{timezone.label}</span>
                  <span className="text-xs text-on-surface-variant">{timezone.offset}</span>
                  {selectedTimezone === timezone.value && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TimezoneSelector;
