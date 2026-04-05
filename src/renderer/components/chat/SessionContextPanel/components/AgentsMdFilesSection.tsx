/**
 * AgentsMdFilesSection - Section for displaying AGENTS.md files with nested groups.
 */

import React, { useMemo } from 'react';

import { AGENTS_MD_GROUP_CONFIG, AGENTS_MD_GROUP_ORDER } from '../types';

import { AgentsMdSubSection } from './AgentsMdSection';
import { CollapsibleSection } from './CollapsibleSection';

import type { AgentsMdGroupCategory } from '../types';
import type { AgentsMdContextInjection } from '@renderer/types/contextInjection';

interface AgentsMdFilesSectionProps {
  injections: AgentsMdContextInjection[];
  tokenCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  projectRoot: string;
  onNavigateToTurn?: (turnIndex: number) => void;
}

export const AgentsMdFilesSection = ({
  injections,
  tokenCount,
  isExpanded,
  onToggle,
  projectRoot,
  onNavigateToTurn,
}: Readonly<AgentsMdFilesSectionProps>): React.ReactElement | null => {
  // Group AGENTS.md injections by category
  const agentsMdGroups = useMemo(() => {
    const groups = new Map<AgentsMdGroupCategory, AgentsMdContextInjection[]>();

    for (const category of AGENTS_MD_GROUP_ORDER) {
      groups.set(category, []);
    }

    for (const injection of injections) {
      for (const [category, config] of Object.entries(AGENTS_MD_GROUP_CONFIG)) {
        if (config.sources.includes(injection.source)) {
          const group = groups.get(category as AgentsMdGroupCategory) ?? [];
          group.push(injection);
          groups.set(category as AgentsMdGroupCategory, group);
          break;
        }
      }
    }

    return groups;
  }, [injections]);

  // Get non-empty AGENTS.md groups
  const nonEmptyAgentsMdGroups = useMemo(
    () =>
      AGENTS_MD_GROUP_ORDER.filter((category) => {
        const group = agentsMdGroups.get(category);
        return group && group.length > 0;
      }),
    [agentsMdGroups]
  );

  if (injections.length === 0) return null;

  return (
    <CollapsibleSection
      title="AGENTS.md Files"
      count={injections.length}
      tokenCount={tokenCount}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {nonEmptyAgentsMdGroups.map((category) => {
        const group = agentsMdGroups.get(category) ?? [];
        const config = AGENTS_MD_GROUP_CONFIG[category];
        return (
          <AgentsMdSubSection
            key={category}
            label={config.label}
            injections={group}
            isDirectory={category === 'directory'}
            projectRoot={projectRoot}
            onNavigateToTurn={onNavigateToTurn}
          />
        );
      })}
    </CollapsibleSection>
  );
};
