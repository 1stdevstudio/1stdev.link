import React from 'react';
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
      <Icon size={placement === 'sidebar' ? 19 : 20} strokeWidth={isActive ? 2.15 : 1.75} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
};
