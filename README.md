# opencode-plugin-team-agreements

An [OpenCode](https://opencode.ai) plugin that helps teams of humans and LLM agents establish, document, and maintain shared agreements for collaborating on a codebase.

## Features

- **Interactive facilitation** - Guides teams through establishing agreements one topic at a time
- **Core topics covered**:
  - Storage location for agreements
  - Programming languages and their purposes
  - Code quality standards
  - Commit message conventions
  - Integration workflow (branching, PRs, CI)
  - Testing requirements
  - Amendment process for updating agreements
- **Extensible** - Add custom topics beyond the core set
- **Context injection** - Automatically injects agreements into LLM context at session start and after compaction
- **Topic suggestions** - Users can suggest new standard topics via GitHub issues (using `gh` CLI)

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

The plugin will guide you through establishing agreements for your project. You can also provide context:

```
/team-agreements I want to update our commit message conventions
```

### Options when agreements exist

If `docs/TEAM_AGREEMENTS.md` already exists, you'll be presented with options to:
- **Review** - Display current agreements
- **Amend** - Modify a specific section
- **Start Over** - Begin fresh (with confirmation)

## How it works

1. **Command registration** - The plugin registers the `/team-agreements` command via OpenCode's config hook
2. **Interactive conversation** - An LLM guides you through each topic, asking one question at a time
3. **Document generation** - Creates `docs/TEAM_AGREEMENTS.md` with your agreements
4. **Auto-injection** - Adds agreements to the `instructions` config so all agents see them
5. **Compaction handling** - Re-injects agreements after context compaction in long sessions

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
