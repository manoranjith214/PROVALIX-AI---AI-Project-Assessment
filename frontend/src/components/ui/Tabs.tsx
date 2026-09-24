import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`border-b border-[#243047] flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap select-none cursor-pointer ${
              isActive
                ? 'border-[#7C3AED] text-[#A78BFA] font-semibold'
                : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#334155]'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-[#7C3AED]/20 text-[#A78BFA]' : 'bg-[#1E293B] text-[#94A3B8]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
