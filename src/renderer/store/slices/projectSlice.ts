/**
 * Project slice - manages project list state and selection.
 */

import { api } from '@renderer/api';

import { getSessionResetState } from '../utils/stateResetHelpers';

import type { AppState } from '../types';
import type { Project, Session } from '@renderer/types/data';
import type { StateCreator } from 'zustand';

// =============================================================================
// Slice Interface
// =============================================================================

export interface SessionCacheEntry {
  sessions: Session[];
  cursor: string | null;
  hasMore: boolean;
  totalCount: number;
  timestamp: number;
}

export interface ProjectSlice {
  // State
  projects: Project[];
  selectedProjectId: string | null;
  projectsLoading: boolean;
  projectsError: string | null;
  _sessionCache: Map<string, SessionCacheEntry>;
  hiddenProjectIds: string[];
  showHiddenProjects: boolean;

  // Actions
  fetchProjects: () => Promise<void>;
  selectProject: (id: string) => void;
  loadHiddenProjects: () => Promise<void>;
  toggleHideProject: (id: string) => Promise<void>;
  toggleShowHiddenProjects: () => void;
}

// =============================================================================
// Slice Creator
// =============================================================================

export const createProjectSlice: StateCreator<AppState, [], [], ProjectSlice> = (set, get) => ({
  // Initial state
  projects: [],
  selectedProjectId: null,
  projectsLoading: false,
  projectsError: null,
  _sessionCache: new Map(),
  hiddenProjectIds: [],
  showHiddenProjects: false,

  // Fetch all projects from main process
  fetchProjects: async () => {
    set({ projectsLoading: true, projectsError: null });
    try {
      const projects = await api.getProjects();
      // Sort by most recent session (descending)
      const sorted = [...projects].sort(
        (a, b) => (b.mostRecentSession ?? 0) - (a.mostRecentSession ?? 0)
      );
      set({ projects: sorted, projectsLoading: false });
    } catch (error) {
      set({
        projectsError: error instanceof Error ? error.message : 'Failed to fetch projects',
        projectsLoading: false,
      });
      return;
    }
    await get().loadHiddenProjects();
  },

  loadHiddenProjects: async () => {
    try {
      const hiddenProjectIds = await api.config.getHiddenProjects();
      set({ hiddenProjectIds });
    } catch {
      // Non-fatal: leave hiddenProjectIds as-is
    }
  },

  toggleHideProject: async (id: string) => {
    const isHidden = get().hiddenProjectIds.includes(id);
    if (isHidden) {
      await api.config.unhideProject(id);
      set((s) => ({ hiddenProjectIds: s.hiddenProjectIds.filter((pid) => pid !== id) }));
    } else {
      await api.config.hideProject(id);
      set((s) => ({ hiddenProjectIds: [id, ...s.hiddenProjectIds] }));
    }
  },

  toggleShowHiddenProjects: () => {
    set((s) => ({ showHiddenProjects: !s.showHiddenProjects }));
  },

  // Select a project and fetch its sessions (paginated)
  selectProject: (id: string) => {
    const cached = get()._sessionCache.get(id);

    if (cached) {
      set({
        selectedProjectId: id,
        sidebarCollapsed: false,
        sessions: cached.sessions,
        sessionsCursor: cached.cursor,
        sessionsHasMore: cached.hasMore,
        sessionsTotalCount: cached.totalCount,
        sessionsLoading: false,
        sessionsError: null,
        selectedSessionId: null,
        sessionDetail: null,
        sessionContextStats: null,
        sessionDetailError: null,
      });
      // Invalidate stale cache so fetchSessionsInitial() overwrites with fresh data
      get()._sessionCache.delete(id);
    } else {
      set({
        selectedProjectId: id,
        sidebarCollapsed: false,
        ...getSessionResetState(),
      });
    }

    // Always fetch fresh data (background refresh when cached)
    void get().fetchSessionsInitial(id);
  },
});
