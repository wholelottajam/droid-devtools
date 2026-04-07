/**
 * IPC Channel Constants
 *
 * Centralized IPC channel names to avoid string duplication in preload bridge.
 */

// =============================================================================
// Config API Channels
// =============================================================================

/** Get application config */
export const CONFIG_GET = 'config:get';

/** Update config section */
export const CONFIG_UPDATE = 'config:update';

/** Add regex pattern to ignore list */
export const CONFIG_ADD_IGNORE_REGEX = 'config:addIgnoreRegex';

/** Remove regex pattern from ignore list */
export const CONFIG_REMOVE_IGNORE_REGEX = 'config:removeIgnoreRegex';

/** Add repository to ignore list */
export const CONFIG_ADD_IGNORE_REPOSITORY = 'config:addIgnoreRepository';

/** Remove repository from ignore list */
export const CONFIG_REMOVE_IGNORE_REPOSITORY = 'config:removeIgnoreRepository';

/** Snooze notifications */
export const CONFIG_SNOOZE = 'config:snooze';

/** Clear notification snooze */
export const CONFIG_CLEAR_SNOOZE = 'config:clearSnooze';

/** Add notification trigger */
export const CONFIG_ADD_TRIGGER = 'config:addTrigger';

/** Update notification trigger */
export const CONFIG_UPDATE_TRIGGER = 'config:updateTrigger';

/** Remove notification trigger */
export const CONFIG_REMOVE_TRIGGER = 'config:removeTrigger';

/** Get all triggers */
export const CONFIG_GET_TRIGGERS = 'config:getTriggers';

/** Test a trigger */
export const CONFIG_TEST_TRIGGER = 'config:testTrigger';

/** Select folders dialog */
export const CONFIG_SELECT_FOLDERS = 'config:selectFolders';

/** Select local Factory root folder */
export const CONFIG_SELECT_FACTORY_ROOT_FOLDER = 'config:selectFactoryRootFolder';

/** Get effective/default Factory root folder info */
export const CONFIG_GET_FACTORY_ROOT_INFO = 'config:getFactoryRootInfo';

/** Find WSL Factory root candidates (Windows only) */
export const CONFIG_FIND_WSL_FACTORY_ROOTS = 'config:findWslFactoryRoots';

/** Open config file in external editor */
export const CONFIG_OPEN_IN_EDITOR = 'config:openInEditor';

/** Pin a session */
export const CONFIG_PIN_SESSION = 'config:pinSession';

/** Unpin a session */
export const CONFIG_UNPIN_SESSION = 'config:unpinSession';

/** Hide a session */
export const CONFIG_HIDE_SESSION = 'config:hideSession';

/** Unhide a session */
export const CONFIG_UNHIDE_SESSION = 'config:unhideSession';

/** Bulk hide sessions */
export const CONFIG_HIDE_SESSIONS = 'config:hideSessions';

/** Bulk unhide sessions */
export const CONFIG_UNHIDE_SESSIONS = 'config:unhideSessions';

/** Hide a project */
export const CONFIG_HIDE_PROJECT = 'config:hideProject';

/** Unhide a project */
export const CONFIG_UNHIDE_PROJECT = 'config:unhideProject';

/** Get all hidden project IDs */
export const CONFIG_GET_HIDDEN_PROJECTS = 'config:getHiddenProjects';

// =============================================================================
// Updater API Channels
// =============================================================================

/** Check for updates */
export const UPDATER_CHECK = 'updater:check';

/** Download available update */
export const UPDATER_DOWNLOAD = 'updater:download';

/** Quit and install downloaded update */
export const UPDATER_INSTALL = 'updater:install';

/** Status event channel (main -> renderer) */
export const UPDATER_STATUS = 'updater:status';

// =============================================================================
// HTTP Server API Channels
// =============================================================================

/** Start HTTP sidecar server */
export const HTTP_SERVER_START = 'httpServer:start';

/** Stop HTTP sidecar server */
export const HTTP_SERVER_STOP = 'httpServer:stop';

/** Get HTTP server status */
export const HTTP_SERVER_GET_STATUS = 'httpServer:getStatus';

// =============================================================================
// Window Controls API (Windows / Linux — native title bar is hidden)
// =============================================================================

/** Minimize window */
export const WINDOW_MINIMIZE = 'window:minimize';

/** Maximize or restore window */
export const WINDOW_MAXIMIZE = 'window:maximize';

/** Close window */
export const WINDOW_CLOSE = 'window:close';

/** Whether the window is currently maximized */
export const WINDOW_IS_MAXIMIZED = 'window:isMaximized';

/** Relaunch the application */
export const APP_RELAUNCH = 'app:relaunch';

/** Refresh session shortcut (main → renderer, triggered by Ctrl+R / Cmd+R) */
export const SESSION_REFRESH = 'session:refresh';

// =============================================================================
// Droid Config API Channels
// =============================================================================

/** Get droid definitions from ~/.factory/droids/ */
export const GET_DROID_CONFIGS = 'get-droid-configs';

// =============================================================================
// Search API Channels
// =============================================================================

/** Find a session by its exact UUID across all projects */
export const FIND_SESSION_BY_ID = 'find-session-by-id';

/** Find sessions whose IDs contain a given hex fragment */
export const FIND_SESSIONS_BY_PARTIAL_ID = 'find-sessions-by-partial-id';
