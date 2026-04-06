---
globs: ["test/**/*", "**/*.test.ts", "**/*.spec.ts"]
---

# Testing Conventions

## Test Framework
Uses Vitest with `happy-dom` environment. Config in `vitest.config.ts`.

## Test Commands
```bash
pnpm test                 # Run all vitest tests
pnpm test:watch           # Watch mode
pnpm test:coverage        # Coverage report
pnpm test:coverage:critical # Critical path coverage
pnpm test:chunks          # Chunk building tests
pnpm test:semantic        # Semantic step extraction
pnpm test:noise           # Noise filtering tests
pnpm test:task-filtering  # Task tool filtering
```

## Test Structure
```
test/
├── main/
│   ├── ipc/             # IPC handler tests
│   │   ├── configValidation.test.ts
│   │   ├── globalSearch.test.ts
│   │   ├── guards.test.ts
│   │   └── searchSessionId.test.ts
│   ├── services/        # Service tests
│   │   ├── analysis/    (ChunkBuilder)
│   │   ├── discovery/   (ProjectPathResolver, ProjectScanner, SessionSearcher, SearchTextCache, SearchTextExtractor)
│   │   ├── infrastructure/ (FileWatcher)
│   │   └── parsing/     (AgentConfigReader, MessageClassifier, SessionParser, sessionSettingsReader)
│   └── utils/           # Main process utilities
│       ├── droidJsonlParsing.test.ts
│       ├── jsonl.test.ts
│       ├── pathDecoder.test.ts
│       ├── pathValidation.test.ts
│       ├── regexValidation.test.ts
│       └── tokenizer.test.ts
├── renderer/
│   ├── hooks/           # Hook tests
│   │   ├── navigationUtils.test.ts
│   │   ├── useAutoScrollBottom.test.ts
│   │   ├── useSearchContextNavigation.test.ts
│   │   └── useVisibleAIGroup.test.ts
│   ├── store/           # Zustand store slices
│   │   ├── notificationSlice.test.ts
│   │   ├── paneSlice.test.ts
│   │   ├── pathResolution.test.ts
│   │   ├── sessionSlice.test.ts
│   │   ├── tabSlice.test.ts
│   │   └── tabUISlice.test.ts
│   ├── components/      # Component tests
│   │   └── renderOutput.test.ts
│   ├── constants/       # Constants tests
│   │   └── teamColors.test.ts
│   └── utils/           # Renderer utilities
│       ├── claudeMdTracker.test.ts
│       ├── dateGrouping.test.ts
│       ├── displayItemBuilder.test.ts
│       ├── formatters.test.ts
│       ├── keyboardUtils.test.ts
│       ├── pathUtils.test.ts
│       ├── renderHelpers.test.ts
│       ├── sessionExporter.test.ts
│       └── stringUtils.test.ts
├── shared/
│   └── utils/           # Shared utilities
│       ├── markdownSearchRendererAlignment.test.ts
│       ├── markdownTextSearch.test.ts
│       ├── modelParser.test.ts
│       ├── sessionIdValidator.test.ts
│       └── tokenFormatting.test.ts
├── mocks/               # Test fixtures and mocks
└── setup.ts             # Test setup/config
```

## Files to Test After Changes
- `services/analysis/ChunkBuilder.ts` - Chunk building logic
- `services/parsing/SessionParser.ts` - JSONL parsing
- `services/parsing/MessageClassifier.ts` - Message classification
- Store slices in `src/renderer/store/slices/`
- Utility functions in `*/utils/`

## Test Data
Test fixtures use real JSONL session data from `~/.claude/projects/`.
