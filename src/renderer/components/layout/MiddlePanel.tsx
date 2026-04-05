import React from 'react';

import { ChatHistory } from '../chat/ChatHistory';
import { SessionSettingsBadge } from '../chat/SessionSettingsBadge';
import { TokenAnalysisPanel } from '../chat/TokenAnalysisPanel';
import { SearchBar } from '../search/SearchBar';

interface MiddlePanelProps {
  /** Tab ID for per-tab state isolation (scroll position, etc.) */
  tabId?: string;
}

export const MiddlePanel: React.FC<MiddlePanelProps> = ({ tabId }) => {
  return (
    <div className="relative flex h-full flex-col">
      <SearchBar tabId={tabId} />
      <SessionSettingsBadge tabId={tabId} />
      <TokenAnalysisPanel tabId={tabId} />
      <ChatHistory tabId={tabId} />
    </div>
  );
};
