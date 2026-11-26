'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExpandableDetailsProps {
  summary: string;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
}

export const ExpandableDetails: React.FC<ExpandableDetailsProps> = ({
  summary,
  defaultOpen = false,
  icon,
  children,
  className = '',
  buttonClassName = '',
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-md py-1 ${buttonClassName}`}
      >
        {icon}
        <span>{summary}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-zinc-100">
          {children}
        </div>
      )}
    </div>
  );
};
