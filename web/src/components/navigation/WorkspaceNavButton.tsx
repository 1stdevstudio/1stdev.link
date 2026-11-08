import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import type { TabType, WorkspaceNavItem } from './workspaceNav';

interface WorkspaceNavButtonProps {
  item: WorkspaceNavItem;
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  placement: 'sidebar' | 'dock';
}

export const WorkspaceNavButton: React.FC<WorkspaceNavButtonProps> = ({
  item, currentTab, onTabChange, placement,
}) => {
  const { tx } = useI18n();
  const isActive = currentTab === item.id;
  const label = tx(item.labelId, item.labelEn);
  const Icon = item.Icon;

  return (
    <button
      type="button"
      data-nav-id={item.id}
      aria-current={isActive ? 'page' : undefined}
      className={placement === 'sidebar'
        ? 'workspace-nav-item panel3-nav-item'
        : 'dock-btn' + (isActive ? ' on' : '')}
      onClick={() => onTabChange(item.id)}
    >
      {placement === 'sidebar' ? (
        <span className="sidebar4-nav-icon"><Icon size={19} strokeWidth={isActive ? 2.2 : 1.85} aria-hidden="true" /></span>
      ) : (
        <Icon size={20} strokeWidth={isActive ? 2.15 : 1.75} aria-hidden="true" />
      )}
      <span className="sidebar4-nav-text">{label}</span>
      {placement === 'sidebar' && <ChevronRight className="sidebar4-nav-arrow" size={16} aria-hidden="true" />}
    </button>
  );
};
