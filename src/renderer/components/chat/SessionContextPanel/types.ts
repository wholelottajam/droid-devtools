/**
 * Type definitions for SessionContextPanel components.
 */

import type { AgentsMdSource } from '@renderer/types/agentsMd';
import type { ContextInjection, ContextPhaseInfo } from '@renderer/types/contextInjection';

// =============================================================================
// Props Interface
// =============================================================================

export interface SessionContextPanelProps {
  /** All accumulated context injections */
  injections: ContextInjection[];
  /** Close button handler */
  onClose?: () => void;
  /** Project root for relative path display */
  projectRoot?: string;
  /** Click Turn N to navigate to that turn */
  onNavigateToTurn?: (turnIndex: number) => void;
  /** Navigate to a specific tool within a turn by toolUseId */
  onNavigateToTool?: (turnIndex: number, toolUseId: string) => void;
  /** Navigate to the user message group preceding the AI group at turnIndex */
  onNavigateToUserGroup?: (turnIndex: number) => void;
  /** Total session tokens (input + output + cache) for comparison */
  totalSessionTokens?: number;
  /** Phase information for phase selector */
  phaseInfo?: ContextPhaseInfo;
  /** Currently selected phase (null = current/latest) */
  selectedPhase: number | null;
  /** Callback to change selected phase */
  onPhaseChange: (phase: number | null) => void;
}

// =============================================================================
// Section Types
// =============================================================================

/** Section type constants */
export const SECTION_AGENTS_MD = 'claude-md' as const;
export const SECTION_MENTIONED_FILES = 'mentioned-files' as const;
export const SECTION_TOOL_OUTPUTS = 'tool-outputs' as const;
export const SECTION_THINKING_TEXT = 'thinking-text' as const;
export const SECTION_TASK_COORDINATION = 'task-coordination' as const;
export const SECTION_USER_MESSAGES = 'user-messages' as const;

/** Section identifiers for collapsible panels */
export type SectionType =
  | typeof SECTION_AGENTS_MD
  | typeof SECTION_MENTIONED_FILES
  | typeof SECTION_TOOL_OUTPUTS
  | typeof SECTION_THINKING_TEXT
  | typeof SECTION_TASK_COORDINATION
  | typeof SECTION_USER_MESSAGES;

/** View mode for the context panel */
export type ContextViewMode = 'category' | 'ranked';

// =============================================================================
// AGENTS.md Group Types
// =============================================================================

/** Group category for AGENTS.md files */
export type AgentsMdGroupCategory = 'global' | 'project' | 'directory';

interface AgentsMdGroupConfig {
  label: string;
  sources: AgentsMdSource[];
}

export const AGENTS_MD_GROUP_CONFIG: Record<AgentsMdGroupCategory, AgentsMdGroupConfig> = {
  global: {
    label: 'Global',
    sources: ['enterprise', 'user-memory', 'user-rules', 'auto-memory'],
  },
  project: {
    label: 'Project',
    sources: ['project-memory', 'project-rules', 'project-local'],
  },
  directory: {
    label: 'Directory',
    sources: ['directory'],
  },
};

export const AGENTS_MD_GROUP_ORDER: AgentsMdGroupCategory[] = ['global', 'project', 'directory'];
