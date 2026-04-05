import React, { useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { Calendar } from 'lucide-react';

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

export interface DateRangePickerComponentProps {
  value?: DateRangeValue;
  onChange?: (value: DateRangeValue | null) => void;
  showTime?: boolean;
  placeholder?: [string, string];
  className?: string;
  disabled?: boolean;
  format?: string;
  size?: 'small' | 'middle' | 'large';
  disableFuture?: boolean;
  maxRangeDays?: number;
}

type QuickRangeValue = string | DateRangeValue;

export interface QuickDateRangePickerProps {
  value?: QuickRangeValue;
  onChange?: ((value: string, dateRange?: DateRangeValue) => void) | ((value: DateRangeValue | null) => void);
  showTime?: boolean;
  maxRangeDays?: number;
}

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'Last 30 Days', value: 'last30days' },
  { label: 'Last 3 Months', value: 'last3months' },
  { label: 'This Month', value: 'thismonth' },
  { label: 'Last Month', value: 'lastmonth' },
  { label: 'This Year', value: 'thisyear' },
  { label: 'Last Year', value: 'lastyear' },
];

function normalizePreset(type: string | number | undefined): string {
  if (typeof type === 'number') {
    if (type === 7) {
      return 'last7days';
    }

    if (type === 30) {
      return 'last30days';
    }
  }

  return typeof type === 'string' && type.length > 0 ? type : 'last7days';
}

function getPresetRange(preset: string): [Dayjs, Dayjs] {
  const now = dayjs();

  switch (preset) {
    case 'today':
      return [now.startOf('day'), now.endOf('day')];
    case 'yesterday':
      return [now.subtract(1, 'day').startOf('day'), now.subtract(1, 'day').endOf('day')];
    case 'last30days':
      return [now.subtract(29, 'day').startOf('day'), now.endOf('day')];
    case 'last3months':
      return [now.subtract(3, 'month').startOf('day'), now.endOf('day')];
    case 'thismonth':
      return [now.startOf('month'), now.endOf('month')];
    case 'lastmonth':
      return [now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')];
    case 'thisyear':
      return [now.startOf('year'), now.endOf('year')];
    case 'lastyear':
      return [now.subtract(1, 'year').startOf('year'), now.subtract(1, 'year').endOf('year')];
    case 'last7days':
    default:
      return [now.subtract(6, 'day').startOf('day'), now.endOf('day')];
  }
}

function toIsoRange(start: Dayjs, end: Dayjs, showTime: boolean): DateRangeValue {
  return {
    startDate: (showTime ? start : start.startOf('day')).toISOString(),
    endDate: (showTime ? end : end.endOf('day')).toISOString(),
  };
}

function toInputValue(value: string | undefined, showTime: boolean): string {
  if (!value) {
    return '';
  }

  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return '';
  }

  return parsed.format(showTime ? 'YYYY-MM-DDTHH:mm' : 'YYYY-MM-DD');
}

function fromInputValue(value: string, showTime: boolean, edge: 'start' | 'end'): Dayjs {
  const parsed = dayjs(value);
  if (showTime) {
    return parsed;
  }

  return edge === 'start' ? parsed.startOf('day') : parsed.endOf('day');
}

function getPresetForRange(range: DateRangeValue | null): string {
  if (!range) {
    return 'custom';
  }

  for (const preset of PRESETS) {
    const [start, end] = getPresetRange(preset.value);
    if (dayjs(range.startDate).isSame(start, 'minute') && dayjs(range.endDate).isSame(end, 'minute')) {
      return preset.value;
    }
  }

  return 'custom';
}

function getMaxInputValue(showTime: boolean): string {
  return showTime ? dayjs().format('YYYY-MM-DDTHH:mm') : dayjs().format('YYYY-MM-DD');
}

export function DateRangePickerComponent({
  value,
  onChange,
  showTime = true,
  placeholder = ['Start Date', 'End Date'],
  className = '',
  disabled = false,
  size = 'middle',
  disableFuture = true,
  maxRangeDays,
}: DateRangePickerComponentProps) {
  const [preset, setPreset] = useState<string>(getPresetForRange(value ?? null));
  const [startInput, setStartInput] = useState(() => toInputValue(value?.startDate, showTime));
  const [endInput, setEndInput] = useState(() => toInputValue(value?.endDate, showTime));

  useEffect(() => {
    setPreset(getPresetForRange(value ?? null));
    setStartInput(toInputValue(value?.startDate, showTime));
    setEndInput(toInputValue(value?.endDate, showTime));
  }, [showTime, value?.endDate, value?.startDate]);

  const sizeClass = size === 'small' ? 'py-1.5 text-xs' : size === 'large' ? 'py-3 text-base' : 'py-2 text-sm';

  const commitRange = (nextStart: string, nextEnd: string) => {
    if (!nextStart || !nextEnd) {
      onChange?.(null);
      return;
    }

    const parsedStart = fromInputValue(nextStart, showTime, 'start');
    const parsedEnd = fromInputValue(nextEnd, showTime, 'end');

    if (!parsedStart.isValid() || !parsedEnd.isValid() || parsedEnd.isBefore(parsedStart)) {
      return;
    }

    if (maxRangeDays && parsedEnd.diff(parsedStart, 'day') > maxRangeDays) {
      return;
    }

    onChange?.(toIsoRange(parsedStart, parsedEnd, showTime));
  };

  return (
    <div className={`grid gap-2 md:grid-cols-[minmax(140px,180px)_1fr_1fr] ${className}`.trim()}>
      <label className="relative block">
        <span className="sr-only">Preset</span>
        <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <select
          value={preset}
          disabled={disabled}
          aria-label="Select preset date range"
          onChange={(event) => {
            const nextPreset = event.target.value;
            setPreset(nextPreset);

            if (nextPreset === 'custom') {
              return;
            }

            const [start, end] = getPresetRange(nextPreset);
            const nextRange = toIsoRange(start, end, showTime);
            setStartInput(toInputValue(nextRange.startDate, showTime));
            setEndInput(toInputValue(nextRange.endDate, showTime));
            onChange?.(nextRange);
          }}
          className={`w-full rounded-sm border border-outline-variant bg-surface pl-9 pr-3 ${sizeClass}`}
        >
          {PRESETS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
          <option value="custom">Custom Range</option>
        </select>
      </label>

      <label className="block">
        <span className="sr-only">{placeholder[0]}</span>
        <input
          type={showTime ? 'datetime-local' : 'date'}
          value={startInput}
          max={disableFuture ? getMaxInputValue(showTime) : undefined}
          disabled={disabled}
          placeholder={placeholder[0]}
          aria-label={placeholder[0]}
          className={`w-full rounded-sm border border-outline-variant bg-surface px-3 ${sizeClass}`}
          onChange={(event) => {
            const nextValue = event.target.value;
            setPreset('custom');
            setStartInput(nextValue);
            commitRange(nextValue, endInput);
          }}
        />
      </label>

      <label className="block">
        <span className="sr-only">{placeholder[1]}</span>
        <input
          type={showTime ? 'datetime-local' : 'date'}
          value={endInput}
          max={disableFuture ? getMaxInputValue(showTime) : undefined}
          disabled={disabled}
          placeholder={placeholder[1]}
          aria-label={placeholder[1]}
          className={`w-full rounded-sm border border-outline-variant bg-surface px-3 ${sizeClass}`}
          onChange={(event) => {
            const nextValue = event.target.value;
            setPreset('custom');
            setEndInput(nextValue);
            commitRange(startInput, nextValue);
          }}
        />
      </label>
    </div>
  );
}

export function QuickDateRangePicker({
  value = 'last7days',
  onChange,
  showTime = false,
  maxRangeDays,
}: QuickDateRangePickerProps) {
  const controlledRange = typeof value === 'string' ? getDateRange(value) : value;
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(controlledRange ?? null);

  useEffect(() => {
    setDateRange(controlledRange ?? null);
  }, [controlledRange?.endDate, controlledRange?.startDate]);

  const pickerValue = useMemo(
    () => dateRange ?? getDateRange(normalizePreset(value)),
    [dateRange, value]
  );

  const handleChange = (range: DateRangeValue | null) => {
    setDateRange(range);

    if (typeof value === 'string') {
      const matchedPreset = getPresetForRange(range);
      (onChange as ((value: string, dateRange?: DateRangeValue) => void) | undefined)?.(
        matchedPreset,
        range ?? undefined
      );
      return;
    }

    (onChange as ((value: DateRangeValue | null) => void) | undefined)?.(range);
  };

  return (
    <DateRangePickerComponent
      value={pickerValue}
      onChange={handleChange}
      showTime={showTime}
      maxRangeDays={maxRangeDays}
      size="small"
    />
  );
}

export function getDateRange(type: string | number): DateRangeValue {
  const [start, end] = getPresetRange(normalizePreset(type));
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function formatDateRange(range: DateRangeValue | null, format = 'YYYY-MM-DD HH:mm'): string {
  if (!range) {
    return 'Not selected';
  }

  return `${dayjs(range.startDate).format(format)} - ${dayjs(range.endDate).format(format)}`;
}

export default DateRangePickerComponent;
