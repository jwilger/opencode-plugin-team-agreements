# Team Agreements Plugin - Planning Document

## Vision

An OpenCode plugin that helps teams of humans and LLM agents establish, document,
and maintain shared agreements for collaborating on a codebase.

## Goals

1. **Facilitate** - Guide teams through establishing agreements via interactive conversation
2. **Document** - Generate clear, structured documentation of agreements
3. **Inject** - Ensure LLM agents always have access to agreements (session start + post-compaction)
4. **Enable Enforcement** - Set up project-specific mechanisms to enforce agreements where possible

## Non-Goals (for MVP)

- Direct enforcement by the plugin itself
- Custom topic definitions
- Complex conditional logic between topics

---

## Requirements

### Invocation

- Slash command: `/team-agreements [optional message]`
- Optional message provides context for user's intent
- When agreements exist, present menu:
  - Review current agreements
  - Amend specific section
  - Start over

### Interaction Style

- Highly interactive: one question at a time
- Discuss trade-offs when relevant
- Answers may invalidate or spawn additional questions

### Storage

- Default location: `docs/TEAM_AGREEMENTS.md`
- Supporting files: `docs/team_agreements/*.md`
- Storage location itself is configurable as a team agreement

### Context Injection

- Agreements injected at session start for primary and sub-agents
- Re-injected after context compaction occurs
- Mechanism: Add to `instructions` array in `opencode.json`

### Enforcement (Post-MVP)

Plugin should be capable of setting up (not directly enforcing):
- Pre-commit hooks (husky, lefthook, pre-commit)
- CI/CD configurations (GitHub Actions, etc.)
- Linting rules
- Commit message validation (commitlint)
- PR templates

The plugin asks the team what enforcement tools they want and suggests options.

---

## MVP Topics

### 1. Storage Location
- Where should team agreements be stored?
- Default: `docs/TEAM_AGREEMENTS.md` with `docs/team_agreements/*.md` for details
- Configurable

### 2. Programming Language(s)
- What languages will be used?
- What is each language used for? (frontend, backend, scripts, etc.)
- Are there language-specific style guides to follow?

### 3. Code Quality Standards
- What makes "great" code for this team?
- Readability, performance, simplicity priorities?
- Required patterns or anti-patterns?

### 4. Commit Message Conventions
- What format? (Conventional Commits, custom, freeform)
- Required elements? (ticket numbers, scope, etc.)
- Max length, tense, capitalization rules?

### 5. Integration Workflow
- Trunk-based development vs. feature branches?
- Pull request requirements?
- Who can merge? Review requirements?
- CI checks that must pass?

### 6. Testing Requirements
- What testing is required before code is "done"?
- Coverage thresholds?
- Test types: unit, integration, e2e, property-based?

### 7. Amendment Process
- How are these agreements changed?
- Who has authority to make changes?
- What's the review/approval process?

---

## Future Topics (Post-MVP)

- Architecture decision records (ADRs)
- Dependency management
- Documentation standards
- Error handling conventions
- Naming conventions
- LLM autonomy boundaries
- Session handoff protocols
- Code review process
- Context management for LLMs
- Planning process for functionality
- Work breakdown structure (epics, stories, tasks)
- Prioritization and backlog management
- Information sharing across sessions

---

## Technical Design

### Plugin Structure

```
opencode-plugin-team-agreements/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts              # Plugin entry, exports TeamAgreementsPlugin
└── docs/
    └── PLANNING.md
```

### Plugin Entry Point

The plugin exports a function that returns hooks. Commands are registered
via the `config` hook by mutating the config object:

```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const TeamAgreementsPlugin: Plugin = async (ctx) => {
  return {
    // Register the /team-agreements command via config mutation
    config: async (config) => {
      if (!config.command) {
        (config as any).command = {}
      }
      (config as any).command["team-agreements"] = {
        description: "Establish or review team agreements",
        template: COMMAND_TEMPLATE,
      }
    },

    // Re-inject after compaction
    "experimental.session.compacting": async (input, output) => {
      const agreements = await loadTeamAgreements(ctx.directory)
      if (agreements) {
        output.context.push(agreements)
      }
    },
  }
}
```

### Command Registration

Commands are registered via the `config` hook rather than creating markdown
files. This ensures the command is available immediately on first run without
race conditions.

### Interactive Flow

The command triggers an interactive conversation where the LLM:
1. Checks if agreements exist at the configured location
2. If yes: presents menu (review, amend, start over)
3. If no (or start over): begins topic-by-topic facilitation
4. Each topic asks questions, collects answers
5. After all topics: generates markdown and updates config

### Question Flow per Topic

Each topic module exports:
```typescript
interface Topic {
  id: string
  name: string
  description: string
  questions: TopicQuestion[]
  generate: (answers: Record<string, unknown>) => string // markdown section
}

interface TopicQuestion {
  id: string
  question: string
  followUp?: (answer: unknown) => TopicQuestion[] | null
}
```

Questions can be conditional based on previous answers within the topic
or based on answers from previous topics.

---

## Open Questions

1. How should the plugin handle multi-file agreements? Generate one file
   with references, or manage multiple files directly?
   
   **Decision**: Single main file with `<!-- see: path -->` references to
   detailed sub-documents when a topic needs more than a paragraph.

2. Should the plugin create a backup before overwriting existing agreements?
   
   **Decision**: Yes, create `.bak` file before overwriting.

3. How do we test the interactive flow during development?
   
   **Decision**: Use TodoList project as test bed. Manual testing initially,
   consider automated tests for generator functions.

4. How does the plugin ensure subagents receive the agreements?
   
   **Decision**: The `instructions` config in `opencode.json` is inherited
   by subagents. The compaction hook handles re-injection for long sessions.

---

## Development Approach

1. Build MVP, test against TodoList project
2. Use TodoList to establish real agreements (dogfooding)
3. Iterate based on experience
4. Eventually extract to separate repository and publish to npm

### Phase 1: Scaffold & Basic Command
- [x] Initialize npm package with TypeScript
- [x] Create plugin skeleton
- [x] Register command via config hook
- [x] Test that command is recognized by OpenCode

### Phase 2: Interactive Facilitation Engine
- [x] Build conversation flow for the 7 MVP topics (via detailed command template)
- [x] Each topic has detailed guidance with sub-questions
- [x] Topics flow naturally with LLM-driven follow-up questions

*Note: Facilitation is handled by the LLM following the command template rather than
programmatic topic modules. This provides more natural conversation flow.*

### Phase 3: Agreement Document Generation
- [x] Command template includes output format for `docs/TEAM_AGREEMENTS.md`
- [x] Template guides LLM to create supporting files when needed
- [x] Plugin auto-injects agreements into `instructions` config at startup

### Phase 4: Context Injection
- [x] Hook into `experimental.session.compacting` to re-inject agreements
- [x] Auto-add agreements to `instructions` via config hook at startup

### Phase 5: Menu for Existing Agreements
- [x] Command template instructs LLM to detect existing agreements
- [x] Menu options: Review, Amend, Start Over (handled by LLM)
