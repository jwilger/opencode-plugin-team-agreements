# opencode-plugin-team-agreements

An [OpenCode](https://opencode.ai) plugin that helps teams of humans and LLM agents establish, document, and maintain shared agreements for collaborating on a codebase.

## Features

- **Comprehensive interview** - Covers 7 categories with ~22 topics for thorough team alignment
- **Smart project analysis** - Detects languages, frameworks, CI, testing, AI tools to tailor questions
- **Split document approach**:
  - `docs/TEAM_AGREEMENTS.md` - Full reference documentation for humans
  - `AGENTS.md` - Concise rules that LLMs need in context constantly
- **Interactive facilitation** - Guides teams through one question at a time, allowing skips and pauses
- **Enforcement setup** - Detects existing tooling and offers to set up automatic enforcement
- **Context injection** - Automatically injects LLM-relevant rules after compaction
- **Topic suggestions** - Suggest new standard topics via GitHub issues

## Topics Covered

### 1. Code & Quality
- Programming Languages & Tech Stack
- Code Quality Standards
- Code Review Process
- Testing Requirements

### 2. Integration & Delivery
- Version Control & Branching
- Continuous Integration
- Deployment & Release
- Database & Schema Changes

### 3. Operations & QA
- Security Practices
- Monitoring & Observability
- Performance Standards
- Accessibility & Internationalization

### 4. Documentation & Knowledge
- Documentation Standards
- Architecture Decision Records (ADRs)
- Dependency Management

### 5. AI/LLM Collaboration
- AI Tools & Policies
- Autonomy Boundaries
- AI Code Generation Standards
- Context & Session Management
- Human Oversight & Escalation
- Learning & Improvement

### 6. Team Process
- Development Methodology
- Planning & Work Breakdown
- Communication & Collaboration

### 7. Governance
- Amendment Process
- Open-Ended Topics

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-team-agreements"]
}
```

## Usage

Run the `/team-agreements` command in OpenCode:

```
/team-agreements
```

The plugin will first analyze your project and then guide you through establishing agreements. You can also provide context:

```
/team-agreements I want to update our AI collaboration policies
```

### Options when agreements exist

If `docs/TEAM_AGREEMENTS.md` already exists, you'll be presented with options to:
- **Review** - Display current agreements
- **Amend** - Modify specific sections
- **Regenerate AGENTS.md** - Re-extract LLM-relevant rules

### The split document approach

This plugin creates two files with different purposes:

**`docs/TEAM_AGREEMENTS.md`** - Comprehensive documentation including:
- Complete code standards with examples
- Full deployment and release procedures
- On-call and incident processes
- Meeting cadences and team ceremonies
- Everything humans need for reference

**`AGENTS.md`** - Only rules that affect day-to-day coding:
- Code quality standards and patterns
- Testing requirements
- Commit message format
- AI autonomy boundaries
- Escalation triggers

This split ensures LLM context isn't bloated with procedures they don't need constantly (deployment steps, post-mortem templates, etc.) while still giving humans complete documentation.

## How it works

1. **Project analysis** - Detects your tech stack, frameworks, CI/CD, and AI tools
2. **Tailored interview** - Highlights relevant topics and suggests skippable ones
3. **Interactive conversation** - One question at a time with trade-off discussions
4. **Document generation** - Creates both `docs/TEAM_AGREEMENTS.md` and `AGENTS.md`
5. **Enforcement detection** - Identifies existing tooling (ESLint, Prettier, Husky, etc.)
6. **Enforcement setup** - Offers to configure automatic enforcement where possible
7. **Compaction handling** - Re-injects AGENTS.md after context compaction

## Tools provided

The plugin registers these tools for LLM use:

- `analyze_project` - Detects languages, frameworks, CI, testing, AI tools, and project characteristics
- `detect_enforcement_mechanisms` - Finds existing linters, formatters, and CI workflows
- `suggest_team_agreement_topic` - Files GitHub issues for new topic suggestions

## Suggesting new topics

If you think of a topic that should be standard in team agreements, you can suggest it:

1. During the `/team-agreements` conversation, ask to suggest a topic
2. The plugin will file a GitHub issue for you (requires `gh` CLI)
3. Or manually create an issue at: [Topic Suggestion](https://github.com/jwilger/opencode-plugin-team-agreements/issues/new?template=topic-suggestion.md)

## Development

```bash
# Clone the repository
git clone https://github.com/jwilger/opencode-plugin-team-agreements.git
cd opencode-plugin-team-agreements

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev
```

### Local testing

Reference the local plugin in your project's `opencode.json`:

```json
{
  "plugin": ["/path/to/opencode-plugin-team-agreements"]
}
```

## License

MIT
