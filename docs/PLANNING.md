# Team Agreements Plugin - Planning Document

## Vision

An OpenCode plugin that helps teams of humans and LLM agents establish, document,
and maintain shared agreements for collaborating on a codebase.

## Goals

1. **Facilitate** - Guide teams through establishing agreements via interactive conversation
2. **Document** - Generate clear, structured documentation of agreements (split approach)
3. **Inject** - Ensure LLM agents always have access to relevant rules (via AGENTS.md)
4. **Enable Enforcement** - Detect existing tooling and offer to set up enforcement where possible
5. **Tailor** - Analyze projects to suggest relevant topics and skip irrelevant ones

## Non-Goals

- Direct enforcement by the plugin itself (plugin configures tools, doesn't enforce)
- Custom topic definitions (users can suggest topics via GitHub issues)
- Complex conditional logic between topics

---

## Requirements

### Invocation

- Slash command: `/team-agreements [optional message]`
- Optional message provides context for user's intent
- When agreements exist, present options:
  - Review current agreements
  - Amend specific sections
  - Regenerate AGENTS.md from docs/TEAM_AGREEMENTS.md

### Interaction Style

- Highly interactive: one question at a time
- Discuss trade-offs when relevant
- Allow skipping topics or entire categories
- Support pausing and resuming the interview
- Show progress indicators at category transitions

### Storage (Split Document Approach)

Two files with different purposes:

**`docs/TEAM_AGREEMENTS.md`** - Comprehensive human reference:
- Complete code standards with examples
- Full deployment and release procedures
- On-call and incident processes
- Meeting cadences and team ceremonies
- Everything humans need for reference

**`AGENTS.md`** - Concise LLM context rules:
- Code quality standards and patterns
- Testing requirements
- Commit message format
- AI autonomy boundaries
- Escalation triggers

This split ensures LLM context isn't bloated with procedures they don't need constantly.

### Context Injection

- `AGENTS.md` is auto-loaded by OpenCode (no injection needed at session start)
- Re-injected after context compaction via `experimental.session.compacting` hook

### Project Analysis

Before starting the interview, analyze the project to detect:
- Languages (TypeScript, Python, Rust, Go, etc.)
- Frameworks (React, Express, Django, etc.)
- CI/CD (GitHub Actions, GitLab CI, etc.)
- Testing frameworks (Jest, Vitest, pytest, etc.)
- AI tools already configured (AGENTS.md, CLAUDE.md, Copilot, Cursor)
- Database tools (Prisma, SQLAlchemy, ActiveRecord, migrations)
- Monitoring (Sentry, Datadog, etc.)
- Project characteristics (monorepo, library, frontend/backend)

Use analysis to:
- Highlight particularly relevant topics
- Suggest skippable topics (e.g., skip database topics if no database detected)
- Tailor questions to detected stack

### Enforcement Detection & Setup

Plugin can detect existing enforcement:
- Pre-commit hooks (husky, lefthook, pre-commit)
- Linting (ESLint, Biome, Prettier)
- Commit message validation (commitlint)
- CI/CD configurations (GitHub Actions)
- PR templates

After gathering agreements, offer to set up enforcement where possible.

---

## Topic Categories (22 topics across 7 categories)

### Category 1: Code & Quality
1. Programming Languages & Tech Stack
2. Code Quality Standards
3. Code Review Process
4. Testing Requirements

### Category 2: Integration & Delivery
5. Version Control & Branching
6. Continuous Integration
7. Deployment & Release
8. Database & Schema Changes (skippable if no database)

### Category 3: Operations & QA
9. Security Practices
10. Monitoring & Observability
11. Performance Standards (highlight for frontend)
12. Accessibility & Internationalization (skippable if no frontend)

### Category 4: Documentation & Knowledge
13. Documentation Standards
14. Architecture Decision Records (ADRs)
15. Dependency Management

### Category 5: AI/LLM Collaboration
16. AI Tools & Policies
17. Autonomy Boundaries
18. AI Code Generation Standards
19. Context & Session Management
20. Human Oversight & Escalation
21. Learning & Improvement

### Category 6: Team Process
22. Development Methodology
23. Planning & Work Breakdown
24. Communication & Collaboration

### Category 7: Governance
25. Amendment Process
26. Open-Ended Topics

---

## Technical Design

### Plugin Structure

```
opencode-plugin-team-agreements/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts              # Plugin entry, exports TeamAgreementsPlugin
│   ├── index.test.ts         # Tests
│   └── utils.ts              # Helper functions (analyzeProject, formatters, etc.)
└── docs/
    └── PLANNING.md
```

### Plugin Entry Point

The plugin exports a function that returns hooks:

```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const TeamAgreementsPlugin: Plugin = async (ctx) => {
  return {
    // Register command and tools via config mutation
    config: async (config) => {
      // Register /team-agreements command
      config.command = config.command || {}
      config.command["team-agreements"] = {
        description: "Establish or review team agreements",
        template: COMMAND_TEMPLATE,
      }
    },

    // Provide tools for LLM use
    tools: {
      analyze_project: { /* ... */ },
      detect_enforcement_mechanisms: { /* ... */ },
      suggest_team_agreement_topic: { /* ... */ },
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

### Tools Provided

1. **`analyze_project`** - Detects languages, frameworks, CI, testing, AI tools
2. **`detect_enforcement_mechanisms`** - Finds existing linters, hooks, CI workflows
3. **`suggest_team_agreement_topic`** - Files GitHub issues for topic suggestions

### Interactive Flow

1. LLM calls `analyze_project` tool to understand the codebase
2. LLM checks for existing `docs/TEAM_AGREEMENTS.md` and `AGENTS.md`
3. Based on scenario, either:
   - Start fresh interview
   - Present review/amend menu
   - Offer migration from legacy CLAUDE.md setup
4. Guide through categories one topic at a time
5. Generate both documents at the end
6. Call `detect_enforcement_mechanisms` and offer to set up enforcement

---

## Development Phases

### Phase 1: Foundation (COMPLETE)
- [x] Initialize npm package with TypeScript
- [x] Create plugin skeleton
- [x] Register command via config hook
- [x] Basic command template with 7 MVP topics
- [x] Context injection via compaction hook

### Phase 2: Comprehensive Topics (COMPLETE)
- [x] Expand to 7 categories with ~22 topics
- [x] Add detailed questions for each topic
- [x] Include AI/LLM collaboration category (6 topics)

### Phase 3: Smart Detection (COMPLETE)
- [x] Implement `analyzeProject` function
- [x] Detect languages, frameworks, CI, testing
- [x] Detect AI tools (AGENTS.md, CLAUDE.md, Copilot, Cursor)
- [x] Detect database and monitoring tools
- [x] Generate recommendations (highlight/skip topics)
- [x] Register `analyze_project` tool

### Phase 4: Enforcement Detection (COMPLETE)
- [x] Implement `detectEnforcementMechanisms` function
- [x] Detect pre-commit hooks, linters, formatters
- [x] Register `detect_enforcement_mechanisms` tool

### Phase 5: Split Document Approach (COMPLETE)
- [x] Update command template for two-file output
- [x] Define what goes in AGENTS.md vs docs/TEAM_AGREEMENTS.md
- [x] Add merging guidelines for updates
- [x] Handle CLAUDE.md coordination

### Phase 6: Polish & Documentation (COMPLETE)
- [x] Update README with comprehensive feature list
- [x] Update PLANNING.md to reflect final structure
- [x] Ensure all tests pass

### Future Enhancements
- [ ] Expand `detectEnforcementMechanisms` for Python, Rust, Go tools
- [ ] Add templates for common enforcement setups
- [ ] Consider versioning/history of agreement changes
- [ ] Add diff view for amendment proposals

---

## Open Questions (Resolved)

1. **How should the plugin handle multi-file agreements?**
   
   **Decision**: Split approach with `docs/TEAM_AGREEMENTS.md` (comprehensive) and 
   `AGENTS.md` (LLM context only).

2. **Should the plugin create a backup before overwriting?**
   
   **Decision**: Rely on git. The command template instructs intelligent merging
   rather than overwriting.

3. **How does the plugin ensure subagents receive the agreements?**
   
   **Decision**: AGENTS.md is auto-loaded by OpenCode. The compaction hook 
   handles re-injection for long sessions.

4. **What should go in AGENTS.md vs docs/TEAM_AGREEMENTS.md?**
   
   **Decision**: AGENTS.md contains only rules that affect day-to-day coding.
   Everything else (deployment, processes, ceremonies) goes in the full docs.
