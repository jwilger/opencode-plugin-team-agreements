/**
 * Internal utility functions for the team-agreements plugin.
 *
 * NOTE: These are intentionally NOT exported from the main module entry point
 * because OpenCode's plugin loader iterates through all exports and tries to
 * call them as plugin functions. Only the plugin function should be exported
 * from the main entry point.
 */

import { readFile, access } from "fs/promises"
import { join } from "path"
import { exec } from "child_process"
import { promisify } from "util"

export const execAsync = promisify(exec)

export const PLUGIN_REPO = "jwilger/opencode-plugin-team-agreements"

// Using array join to avoid esbuild/tsc issues with ## at start of lines in template literals
export const COMMAND_TEMPLATE = [
  "You are helping establish or review team agreements for this project. Team agreements define how humans and LLM agents collaborate on the codebase.",
  "",
  "User's request: $ARGUMENTS",
  "",
  "## Overview",
  "",
  "Team agreements are stored in `AGENTS.md` in the project root. This file is automatically loaded by OpenCode, Claude Code, and other compatible agentic tools - no configuration needed.",
  "",
  "## Step 1: Analyze Existing Files",
  "",
  "First, check for existing agent instruction files:",
  "",
  "1. **Read `AGENTS.md`** (if it exists) - OpenCode's native format",
  "2. **Read `CLAUDE.md`** (if it exists) - Claude Code's native format",
  "",
  "Analyze their contents to understand:",
  "- What sections/topics already exist?",
  "- Is there existing team agreement content?",
  "- What's the overall structure and style?",
  "",
  "## Step 2: Determine the Scenario",
  "",
  "Based on what you find, you'll be in one of these scenarios:",
  "",
  "### Scenario A: No existing files",
  "- You'll create a new `AGENTS.md` with team agreements",
  "",
  "### Scenario B: AGENTS.md exists (no CLAUDE.md)",
  "- Present the user with options:",
  "  - **Review**: Display current content",
  "  - **Amend**: Modify or add to specific sections",
  "  - **Add Team Agreements**: Integrate new agreement sections into the existing structure",
  "",
  "### Scenario C: CLAUDE.md exists (no AGENTS.md)",
  "- Analyze the CLAUDE.md content",
  '- Ask the user: "I found a CLAUDE.md file. I\'ll migrate universal rules to AGENTS.md and keep any Claude-specific rules in CLAUDE.md. Does that sound good?"',
  "- Create AGENTS.md with the universal content + team agreements",
  "- Update CLAUDE.md to import AGENTS.md (add `@AGENTS.md` at the top)",
  "- Keep only Claude-specific rules in CLAUDE.md",
  "",
  "### Scenario D: Both files exist",
  "- Analyze both files for:",
  "  - **Universal rules** (apply to all agents) → belong in AGENTS.md",
  "  - **Claude-specific rules** → stay in CLAUDE.md",
  "- Ask the user about any ambiguous content",
  "- Ensure CLAUDE.md imports AGENTS.md",
  "- Integrate team agreements into AGENTS.md",
  "",
  "## Step 3: Gather Team Agreements",
  "",
  "If establishing new agreements (or the user wants to add/amend), guide them through these core topics ONE question at a time:",
  "",
  "### Core Topics",
  "",
  "#### a. Programming Languages",
  "- What programming language(s) will be used in this project?",
  "- What is each language used for? (e.g., TypeScript for frontend, Rust for backend)",
  "- Are there specific versions or language-specific style guides to follow?",
  "",
  "#### b. Code Quality Standards",
  '- What does "great code" look like for this team?',
  "- How should we prioritize: readability vs. performance vs. simplicity?",
  "- Are there required patterns or anti-patterns to follow/avoid?",
  "- What about error handling conventions?",
  "- Naming conventions for files, functions, variables, types?",
  "",
  "#### c. Commit Message Conventions",
  "- What format should commit messages follow? (Conventional Commits, custom, freeform)",
  "- Are there required elements? (ticket numbers, scope, breaking change indicators)",
  "- Any rules on length, tense, capitalization?",
  "- Should commits be atomic (one logical change per commit)?",
  "",
  "#### d. Integration Workflow",
  "- Trunk-based development or feature branches?",
  "- Pull request requirements? (reviews, approvals, CI checks)",
  "- Who can merge to main/trunk?",
  "- What CI checks must pass before integration?",
  "- Any branch naming conventions?",
  "",
  "#### e. Testing Requirements",
  '- What testing is required before code is considered "done"?',
  "- Are there coverage thresholds?",
  "- What types of tests? (unit, integration, e2e, property-based)",
  "- When should tests be written? (TDD, after implementation, etc.)",
  "",
  "#### f. Amendment Process",
  "- How can these agreements be changed?",
  "- Who has authority to propose/approve changes?",
  "- What's the review/approval process for amendments?",
  "- How should changes be communicated to the team?",
  "",
  "### Gathering Style",
  "",
  "For each topic:",
  "- Ask ONE question at a time",
  "- Discuss trade-offs when relevant",
  "- Confirm understanding before moving on",
  "- Record the team's decision clearly",
  "",
  "### Additional Topics",
  "",
  "After the core topics, ask:",
  '"Are there any additional topics you\'d like to establish agreements for?"',
  "",
  "Suggest potential additional topics if helpful:",
  "- **Architecture decisions** - How to document and track ADRs",
  "- **Dependency management** - How to evaluate and approve new dependencies",
  "- **Documentation standards** - What must be documented, where, in what format",
  "- **LLM autonomy boundaries** - What can LLMs do without asking? What requires human approval?",
  "- **Session handoff protocols** - How to summarize work for the next session/agent",
  "- **Code review process** - What reviewers should look for, turnaround expectations",
  "- **Planning and work breakdown** - How to break down work into tasks",
  "- **Information sharing** - How to share context across sessions and team members",
  "",
  "Continue asking about each additional topic the user wants to cover.",
  "",
  'After discussing additional topics, ask: "Would you like to suggest any of these additional topics',
  "(or others you thought of) to be included as standard topics in the team-agreements plugin?",
  'I can file a GitHub issue for you if you\'d like."',
  "",
  "If the user wants to suggest a topic, use the `suggest_team_agreement_topic` tool to file an issue.",
  "",
  "## Step 4: Intelligent Merging",
  "",
  "When writing to AGENTS.md, **intelligently merge** with existing content:",
  "",
  "1. **Preserve existing structure** - Don't reorganize content the user already has",
  "2. **Add new sections** - Place team agreement sections in logical locations",
  "3. **Avoid duplication** - If similar content exists, enhance rather than duplicate",
  "4. **Maintain voice** - Match the existing document's tone and style",
  "5. **Use clear section headers** - Make team agreements easy to find",
  "",
  "### Merging Guidelines",
  "",
  '- If AGENTS.md has a "Code Standards" section and you\'re adding "Code Quality Standards", merge them',
  "- If AGENTS.md describes the project structure, keep that and add team agreements as a new section",
  "- Use `## Team Agreements` as a parent section if adding multiple agreement topics to an existing file",
  "- If the file is empty or minimal, create a well-structured document from scratch",
  "",
  "## Step 5: Handle CLAUDE.md Coordination",
  "",
  "If CLAUDE.md exists or was created:",
  "",
  "1. Ensure it has `@AGENTS.md` at the top to import the shared rules",
  "2. Keep only Claude-specific content in CLAUDE.md, such as:",
  "   - Claude-specific behavior instructions",
  "   - Claude-specific tool usage preferences",
  "   - Anything that shouldn't apply to other agents",
  "",
  "Example CLAUDE.md after coordination:",
  "```markdown",
  "@AGENTS.md",
  "",
  "# Claude-Specific Instructions",
  "",
  "[Any rules that only apply to Claude Code, not other agents]",
  "```",
  "",
  "## Step 6: Offer Enforcement Setup",
  "",
  "After generating/updating the agreements, use the `detect_enforcement_mechanisms` tool to check what enforcement is already in place, then offer to set up automatic enforcement for agreements that can be enforced programmatically.",
  "",
  "### Enforcement Mechanisms",
  "",
  "#### Pre-commit Hooks (husky, lefthook, pre-commit)",
  "Ideal for: Commit message validation, code formatting, linting, test execution",
  "",
  "#### CI Workflows (GitHub Actions, etc.)",
  "Ideal for: Test coverage, build verification, security scanning, PR checks",
  "",
  "#### GitHub Rulesets / Branch Protection",
  "Ideal for: PR requirements, review policies, merge restrictions",
  "",
  "#### Linting Rules (.eslintrc, biome.json, etc.)",
  "Ideal for: Code style, naming conventions, import organization",
  "",
  "### When Offering Enforcement",
  "",
  "- Only offer enforcement for agreements that can actually be automated",
  "- Explain what the enforcement will do and how it works",
  "- Get explicit confirmation before making changes",
  "- If enforcement tooling already exists, offer to update/extend it rather than replace it",
  "",
  "## Output Format",
  "",
  "When creating or updating AGENTS.md, integrate team agreements appropriately. If creating from scratch or the file is minimal, use this structure:",
  "",
  "```markdown",
  "# Project Name",
  "",
  "[Brief project description if not already present]",
  "",
  "## Team Agreements",
  "",
  "This section defines how our team (humans and LLM agents) collaborates on this codebase.",
  "",
  "### Programming Languages",
  "[Agreements about languages and their usage]",
  "",
  "### Code Quality Standards",
  "[Agreements about what makes good code]",
  "",
  "### Commit Message Conventions",
  "[Agreements about commit message format]",
  "",
  "### Integration Workflow",
  "[Agreements about how code gets integrated]",
  "",
  "### Testing Requirements",
  "[Agreements about testing]",
  "",
  "### Amendment Process",
  "[Agreements about changing these agreements]",
  "",
  "### Additional Topics",
  "[Any additional topics the team added]",
  "",
  "---",
  "*Team agreements last updated: [date]*",
  "```",
  "",
  "## Important Guidelines",
  "",
  "- Be conversational and collaborative",
  "- ONE question at a time - don't overwhelm",
  "- Respect the user's expertise and preferences",
  "- If the user provides a specific request in their message, address that first",
  "- The core topics are a starting point, not an exhaustive list",
  '- Capture the "why" behind decisions, not just the "what"',
  "- When merging, preserve the user's existing content and style",
  "- Always explain what you're about to do before making file changes",
].join("\n")

/**
 * Check if a file exists at the given path.
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Check if the gh CLI is installed and authenticated.
 */
export async function isGhAvailable(): Promise<boolean> {
  try {
    await execAsync("gh auth status")
    return true
  } catch {
    return false
  }
}

/**
 * Load team agreements from the project directory.
 * Checks AGENTS.md first (primary), then CLAUDE.md (fallback).
 * Returns the content if found, null otherwise.
 */
export async function loadTeamAgreements(
  directory: string
): Promise<string | null> {
  // Check AGENTS.md first (OpenCode native)
  const agentsPath = join(directory, "AGENTS.md")
  // Check CLAUDE.md as fallback (Claude Code native)
  const claudePath = join(directory, "CLAUDE.md")

  try {
    const content = await readFile(agentsPath, "utf-8")
    return (
      "## Team Agreements (from AGENTS.md)\n\nThe following team agreements are in effect for this project:\n\n" +
      content
    )
  } catch {
    // Try CLAUDE.md as fallback
    try {
      const content = await readFile(claudePath, "utf-8")
      return (
        "## Team Agreements (from CLAUDE.md)\n\nThe following team agreements are in effect for this project:\n\n" +
        content
      )
    } catch {
      return null
    }
  }
}

/**
 * Format suggested questions as a markdown list.
 */
export function formatQuestionsAsMarkdown(questions: string[]): string {
  return questions.map((q) => "- " + q).join("\n")
}

/**
 * Build the issue body for a topic suggestion.
 */
export function buildTopicIssueBody(args: {
  topic_name: string
  description: string
  suggested_questions: string[]
  example_agreement?: string
}): string {
  const questionsFormatted = formatQuestionsAsMarkdown(args.suggested_questions)

  return [
    "## Topic Name",
    args.topic_name,
    "",
    "## Description",
    args.description,
    "",
    "## Suggested Questions",
    questionsFormatted,
    "",
    "## Example Agreement",
    args.example_agreement || "_No example provided_",
    "",
    "## Additional Context",
    "_This issue was automatically created via the team-agreements plugin._",
  ].join("\n")
}

/**
 * Enforcement mechanism detection result.
 */
export interface EnforcementMechanism {
  type: string
  name: string
  detected: boolean
  configFile?: string
  notes?: string
}

/**
 * Detect existing enforcement mechanisms in the project.
 */
export async function detectEnforcementMechanisms(
  directory: string
): Promise<EnforcementMechanism[]> {
  const mechanisms: EnforcementMechanism[] = []

  // Pre-commit hooks
  const huskyPath = join(directory, ".husky")
  const lefthookPath = join(directory, "lefthook.yml")
  const lefthookAltPath = join(directory, ".lefthook.yml")
  const preCommitPath = join(directory, ".pre-commit-config.yaml")

  if (await fileExists(huskyPath)) {
    mechanisms.push({
      type: "pre-commit",
      name: "husky",
      detected: true,
      configFile: ".husky/",
      notes: "Git hooks manager for Node.js projects",
    })
  }
  if (await fileExists(lefthookPath)) {
    mechanisms.push({
      type: "pre-commit",
      name: "lefthook",
      detected: true,
      configFile: "lefthook.yml",
      notes: "Fast, cross-platform git hooks manager",
    })
  } else if (await fileExists(lefthookAltPath)) {
    mechanisms.push({
      type: "pre-commit",
      name: "lefthook",
      detected: true,
      configFile: ".lefthook.yml",
      notes: "Fast, cross-platform git hooks manager",
    })
  }
  if (await fileExists(preCommitPath)) {
    mechanisms.push({
      type: "pre-commit",
      name: "pre-commit",
      detected: true,
      configFile: ".pre-commit-config.yaml",
      notes: "Python-based pre-commit framework",
    })
  }

  // Commit message validation
  const commitlintPath = join(directory, "commitlint.config.js")
  const commitlintCjsPath = join(directory, "commitlint.config.cjs")
  const commitlintJsonPath = join(directory, ".commitlintrc.json")

  if (
    (await fileExists(commitlintPath)) ||
    (await fileExists(commitlintCjsPath)) ||
    (await fileExists(commitlintJsonPath))
  ) {
    mechanisms.push({
      type: "commit-validation",
      name: "commitlint",
      detected: true,
      configFile: (await fileExists(commitlintPath))
        ? "commitlint.config.js"
        : (await fileExists(commitlintCjsPath))
          ? "commitlint.config.cjs"
          : ".commitlintrc.json",
      notes: "Lint commit messages against conventional commit format",
    })
  }

  // Linters
  const eslintPath = join(directory, ".eslintrc.json")
  const eslintJsPath = join(directory, "eslint.config.js")
  const eslintMjsPath = join(directory, "eslint.config.mjs")
  const biomePath = join(directory, "biome.json")
  const biomeJsoncPath = join(directory, "biome.jsonc")

  if (
    (await fileExists(eslintPath)) ||
    (await fileExists(eslintJsPath)) ||
    (await fileExists(eslintMjsPath))
  ) {
    mechanisms.push({
      type: "linter",
      name: "eslint",
      detected: true,
      configFile: (await fileExists(eslintPath))
        ? ".eslintrc.json"
        : (await fileExists(eslintJsPath))
          ? "eslint.config.js"
          : "eslint.config.mjs",
      notes: "JavaScript/TypeScript linter",
    })
  }
  if ((await fileExists(biomePath)) || (await fileExists(biomeJsoncPath))) {
    mechanisms.push({
      type: "linter",
      name: "biome",
      detected: true,
      configFile: (await fileExists(biomePath)) ? "biome.json" : "biome.jsonc",
      notes: "Fast formatter and linter for JS/TS/JSON",
    })
  }

  // CI Workflows
  const githubWorkflowsPath = join(directory, ".github", "workflows")
  if (await fileExists(githubWorkflowsPath)) {
    mechanisms.push({
      type: "ci",
      name: "github-actions",
      detected: true,
      configFile: ".github/workflows/",
      notes: "GitHub Actions CI/CD workflows",
    })
  }

  const gitlabCiPath = join(directory, ".gitlab-ci.yml")
  if (await fileExists(gitlabCiPath)) {
    mechanisms.push({
      type: "ci",
      name: "gitlab-ci",
      detected: true,
      configFile: ".gitlab-ci.yml",
      notes: "GitLab CI/CD pipeline",
    })
  }

  const circleCiPath = join(directory, ".circleci", "config.yml")
  if (await fileExists(circleCiPath)) {
    mechanisms.push({
      type: "ci",
      name: "circleci",
      detected: true,
      configFile: ".circleci/config.yml",
      notes: "CircleCI pipeline",
    })
  }

  // PR Templates
  const prTemplatePath = join(directory, ".github", "pull_request_template.md")
  const prTemplateAltPath = join(
    directory,
    ".github",
    "PULL_REQUEST_TEMPLATE.md"
  )
  if (
    (await fileExists(prTemplatePath)) ||
    (await fileExists(prTemplateAltPath))
  ) {
    mechanisms.push({
      type: "pr-template",
      name: "github-pr-template",
      detected: true,
      configFile: (await fileExists(prTemplatePath))
        ? ".github/pull_request_template.md"
        : ".github/PULL_REQUEST_TEMPLATE.md",
      notes: "GitHub Pull Request template",
    })
  }

  // OpenCode configuration
  const opencodePath = join(directory, "opencode.json")
  if (await fileExists(opencodePath)) {
    mechanisms.push({
      type: "opencode",
      name: "opencode-config",
      detected: true,
      configFile: "opencode.json",
      notes: "OpenCode configuration with hooks and plugins",
    })
  }

  // Formatters
  const prettierPath = join(directory, ".prettierrc")
  const prettierJsonPath = join(directory, ".prettierrc.json")
  const prettierJsPath = join(directory, "prettier.config.js")
  if (
    (await fileExists(prettierPath)) ||
    (await fileExists(prettierJsonPath)) ||
    (await fileExists(prettierJsPath))
  ) {
    mechanisms.push({
      type: "formatter",
      name: "prettier",
      detected: true,
      configFile: (await fileExists(prettierPath))
        ? ".prettierrc"
        : (await fileExists(prettierJsonPath))
          ? ".prettierrc.json"
          : "prettier.config.js",
      notes: "Code formatter for JS/TS/CSS/HTML/JSON/MD",
    })
  }

  return mechanisms
}

/**
 * Format enforcement detection results as markdown.
 */
export function formatEnforcementResults(
  mechanisms: EnforcementMechanism[]
): string {
  if (mechanisms.length === 0) {
    return [
      "## Detected Enforcement Mechanisms",
      "",
      "No existing enforcement mechanisms detected. This is a great opportunity to set up automation for your team agreements!",
      "",
      "### Available Options",
      "",
      "You can set up any of the following:",
      "",
      "**Pre-commit Hooks**",
      "- husky (Node.js projects)",
      "- lefthook (cross-platform, fast)",
      "- pre-commit (Python-based, language-agnostic)",
      "",
      "**Commit Message Validation**",
      "- commitlint (conventional commits)",
      "",
      "**Linting/Formatting**",
      "- ESLint (JavaScript/TypeScript)",
      "- Biome (JS/TS/JSON, fast)",
      "- Prettier (formatting)",
      "",
      "**CI/CD**",
      "- GitHub Actions",
      "- GitLab CI",
      "- CircleCI",
      "",
      "**GitHub Features**",
      "- Pull Request templates",
      "- Branch protection rulesets",
    ].join("\n")
  }

  const byType: Record<string, EnforcementMechanism[]> = {}
  for (const m of mechanisms) {
    if (!byType[m.type]) byType[m.type] = []
    byType[m.type].push(m)
  }

  const lines: string[] = [
    "## Detected Enforcement Mechanisms",
    "",
    "The following enforcement mechanisms are already in place:",
    "",
  ]

  const typeLabels: Record<string, string> = {
    "pre-commit": "Pre-commit Hooks",
    "commit-validation": "Commit Message Validation",
    linter: "Linters",
    ci: "CI/CD Pipelines",
    "pr-template": "PR Templates",
    opencode: "OpenCode Configuration",
    formatter: "Formatters",
  }

  for (const [type, mechs] of Object.entries(byType)) {
    lines.push("### " + (typeLabels[type] || type))
    lines.push("")
    for (const m of mechs) {
      lines.push(
        "- **" + m.name + "** (`" + m.configFile + "`): " + m.notes
      )
    }
    lines.push("")
  }

  lines.push("### Recommendations")
  lines.push("")
  lines.push(
    "Based on what's already set up, consider extending or integrating with these existing tools rather than adding new ones."
  )

  return lines.join("\n")
}
