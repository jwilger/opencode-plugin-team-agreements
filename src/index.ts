import { type Plugin, tool } from "@opencode-ai/plugin"
import { readFile, access } from "fs/promises"
import { join } from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

const PLUGIN_REPO = "jwilger/opencode-plugin-team-agreements"

const COMMAND_TEMPLATE = `You are helping establish or review team agreements for this project. Team agreements define how humans and LLM agents collaborate on the codebase.

User's request: $ARGUMENTS

## Instructions

1. First, check if team agreements already exist at \`docs/TEAM_AGREEMENTS.md\`

2. If agreements exist, present the user with options:
   - **Review**: Display the current agreements
   - **Amend**: Modify a specific section  
   - **Start Over**: Begin fresh (with confirmation)

3. If no agreements exist (or starting over), guide the user through establishing agreements one topic at a time. Start with these core topics:

### Core Topics

#### a. Storage Location
Ask where team agreements should be stored. Suggest defaults:
- Main file: \`docs/TEAM_AGREEMENTS.md\`
- Supporting details: \`docs/team_agreements/*.md\`

#### b. Programming Languages
- What programming language(s) will be used in this project?
- What is each language used for? (e.g., TypeScript for frontend, Rust for backend)
- Are there specific versions or language-specific style guides to follow?

#### c. Code Quality Standards
- What does "great code" look like for this team?
- How should we prioritize: readability vs. performance vs. simplicity?
- Are there required patterns or anti-patterns to follow/avoid?
- What about error handling conventions?
- Naming conventions for files, functions, variables, types?

#### d. Commit Message Conventions
- What format should commit messages follow? (Conventional Commits, custom, freeform)
- Are there required elements? (ticket numbers, scope, breaking change indicators)
- Any rules on length, tense, capitalization?
- Should commits be atomic (one logical change per commit)?

#### e. Integration Workflow
- Trunk-based development or feature branches?
- Pull request requirements? (reviews, approvals, CI checks)
- Who can merge to main/trunk?
- What CI checks must pass before integration?
- Any branch naming conventions?

#### f. Testing Requirements
- What testing is required before code is considered "done"?
- Are there coverage thresholds?
- What types of tests? (unit, integration, e2e, property-based)
- When should tests be written? (TDD, after implementation, etc.)

#### g. Amendment Process
- How can these agreements be changed?
- Who has authority to propose/approve changes?
- What's the review/approval process for amendments?
- How should changes be communicated to the team?

4. For each topic:
   - Ask ONE question at a time
   - Discuss trade-offs when relevant
   - Confirm understanding before moving on
   - Record the team's decision clearly

5. **After the core topics**, ask:
   "Are there any additional topics you'd like to establish agreements for?"
   
   Suggest potential additional topics if helpful:
   - **Architecture decisions** - How to document and track ADRs
   - **Dependency management** - How to evaluate and approve new dependencies
   - **Documentation standards** - What must be documented, where, in what format
   - **LLM autonomy boundaries** - What can LLMs do without asking? What requires human approval?
   - **Session handoff protocols** - How to summarize work for the next session/agent
   - **Code review process** - What reviewers should look for, turnaround expectations
   - **Planning and work breakdown** - How to break down work into tasks
   - **Information sharing** - How to share context across sessions and team members
   
   Continue asking about each additional topic the user wants to cover.
   
   After discussing additional topics, ask: "Would you like to suggest any of these additional topics
   (or others you thought of) to be included as standard topics in the team-agreements plugin?
   I can file a GitHub issue for you if you'd like."
   
   If the user wants to suggest a topic, use the \`suggest_team_agreement_topic\` tool to file an issue.

6. After ALL topics (core + additional) are covered:
   - Generate \`docs/TEAM_AGREEMENTS.md\` with all agreements organized by topic
   - If any topic needs detailed documentation, create supporting files in \`docs/team_agreements/\`
   - Update \`opencode.json\` to include \`docs/TEAM_AGREEMENTS.md\` in the \`instructions\` array
   - Summarize what was established

7. **After generating the agreements**, use the \`detect_enforcement_mechanisms\` tool to check what enforcement is already in place, then offer to set up automatic enforcement for agreements that can be enforced programmatically.

   For each agreement that CAN be automatically enforced, ask the user if they'd like help setting it up. Here are the enforcement mechanisms to consider:

   ### Enforcement Mechanisms

   #### OpenCode Plugin Hooks
   Ideal for: LLM behavior guidance, context injection, custom commands
   - Can add validation in \`tool.execute.before\` hooks
   - Can transform messages via \`experimental.chat.messages.transform\`
   - Can inject reminders in \`experimental.session.compacting\`

   #### Pre-commit Hooks (husky, lefthook, pre-commit)
   Ideal for: Commit message validation, code formatting, linting, test execution
   - **Commit messages**: Use commitlint with husky for Conventional Commits or custom formats
   - **Code formatting**: Run prettier/eslint/biome on staged files
   - **Tests**: Run affected tests before allowing commits
   - **File restrictions**: Prevent commits to certain paths

   #### CI Workflows (GitHub Actions, etc.)
   Ideal for: Test coverage, build verification, security scanning, PR checks
   - **Testing requirements**: Enforce coverage thresholds, run full test suites
   - **Code quality**: Run linters, type checking, security audits
   - **Build verification**: Ensure the project builds successfully
   - **PR requirements**: Block merging until checks pass

   #### GitHub Rulesets / Branch Protection
   Ideal for: PR requirements, review policies, merge restrictions
   - **Required reviews**: Set minimum approvals before merge
   - **Required checks**: Specify which CI checks must pass
   - **Branch restrictions**: Control who can push to main/protected branches
   - **Commit signing**: Require verified commits

   #### Linting Rules (.eslintrc, biome.json, etc.)
   Ideal for: Code style, naming conventions, import organization, complexity limits
   - **Naming conventions**: Enforce variable/function/file naming patterns
   - **Code patterns**: Require/forbid certain coding patterns
   - **Import organization**: Enforce import ordering and restrictions

   ### Mapping Agreements to Enforcement

   | Agreement Topic | Possible Enforcement |
   |-----------------|---------------------|
   | Commit message conventions | commitlint + husky, GitHub Actions check |
   | Code quality standards | ESLint/Biome rules, pre-commit hooks, CI checks |
   | Testing requirements | CI workflow with coverage thresholds, pre-commit test runs |
   | Integration workflow | GitHub rulesets, required status checks, PR templates |
   | Programming language standards | Language-specific linters, compiler flags |

   ### When Offering Enforcement

   - Only offer enforcement for agreements that can actually be automated
   - Explain what the enforcement will do and how it works
   - Get explicit confirmation before making changes
   - If enforcement tooling already exists (detected by the tool), offer to update/extend it rather than replace it
   - Document what enforcement was set up in the TEAM_AGREEMENTS.md file

## Output Format

When generating the TEAM_AGREEMENTS.md file, use this structure:

\`\`\`markdown
# Team Agreements

This document defines how our team (humans and LLM agents) collaborates on this codebase.

## Table of Contents
[Generate based on topics covered]

## 1. Storage Location
[Agreements about where documentation lives]

## 2. Programming Languages
[Agreements about languages and their usage]

## 3. Code Quality Standards
[Agreements about what makes good code]

## 4. Commit Message Conventions
[Agreements about commit message format]

## 5. Integration Workflow
[Agreements about how code gets integrated]

## 6. Testing Requirements
[Agreements about testing]

## 7. Amendment Process
[Agreements about changing these agreements]

## Additional Topics
[Any additional topics the team added]

---
*Last updated: [date]*
*To amend these agreements, [process from amendment section]*
\`\`\`

## Important

- Be conversational and collaborative
- ONE question at a time - don't overwhelm
- Respect the user's expertise and preferences
- If the user provides a specific request in their message, address that first
- The core topics are a starting point, not an exhaustive list
- Capture the "why" behind decisions, not just the "what"`

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
 * Returns the content if found, null otherwise.
 */
export async function loadTeamAgreements(directory: string): Promise<string | null> {
  const defaultPath = join(directory, "docs", "TEAM_AGREEMENTS.md")

  try {
    const content = await readFile(defaultPath, "utf-8")
    return `## Team Agreements\n\nThe following team agreements are in effect for this project:\n\n${content}`
  } catch {
    return null
  }
}

/**
 * Format suggested questions as a markdown list.
 */
export function formatQuestionsAsMarkdown(questions: string[]): string {
  return questions.map((q) => `- ${q}`).join("\n")
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

  return `## Topic Name
${args.topic_name}

## Description
${args.description}

## Suggested Questions
${questionsFormatted}

## Example Agreement
${args.example_agreement || "_No example provided_"}

## Additional Context
_This issue was automatically created via the team-agreements plugin._`
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
      configFile:
        (await fileExists(commitlintPath))
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
  const prTemplateAltPath = join(directory, ".github", "PULL_REQUEST_TEMPLATE.md")
  if ((await fileExists(prTemplatePath)) || (await fileExists(prTemplateAltPath))) {
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
export function formatEnforcementResults(mechanisms: EnforcementMechanism[]): string {
  if (mechanisms.length === 0) {
    return `## Detected Enforcement Mechanisms

No existing enforcement mechanisms detected. This is a great opportunity to set up automation for your team agreements!

### Available Options

You can set up any of the following:

**Pre-commit Hooks**
- husky (Node.js projects)
- lefthook (cross-platform, fast)
- pre-commit (Python-based, language-agnostic)

**Commit Message Validation**
- commitlint (conventional commits)

**Linting/Formatting**
- ESLint (JavaScript/TypeScript)
- Biome (JS/TS/JSON, fast)
- Prettier (formatting)

**CI/CD**
- GitHub Actions
- GitLab CI
- CircleCI

**GitHub Features**
- Pull Request templates
- Branch protection rulesets`
  }

  const byType: Record<string, EnforcementMechanism[]> = {}
  for (const m of mechanisms) {
    if (!byType[m.type]) byType[m.type] = []
    byType[m.type].push(m)
  }

  let result = `## Detected Enforcement Mechanisms

The following enforcement mechanisms are already in place:\n\n`

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
    result += `### ${typeLabels[type] || type}\n\n`
    for (const m of mechs) {
      result += `- **${m.name}** (\`${m.configFile}\`): ${m.notes}\n`
    }
    result += "\n"
  }

  result += `### Recommendations

Based on what's already set up, consider extending or integrating with these existing tools rather than adding new ones.`

  return result
}

// Export constants for testing
export { COMMAND_TEMPLATE, PLUGIN_REPO }

/**
 * TeamAgreementsPlugin - Helps teams establish and maintain shared agreements
 * for human-LLM collaboration on a codebase.
 */
export const TeamAgreementsPlugin: Plugin = async (ctx) => {
  const { directory } = ctx
  const agreementsPath = "docs/TEAM_AGREEMENTS.md"
  const fullAgreementsPath = join(directory, agreementsPath)

  return {
    /**
     * Inject command definition and ensure agreements are in instructions
     */
    config: async (config) => {
      // Add the /team-agreements command
      if (!config.command) {
        (config as any).command = {}
      }
      (config as any).command["team-agreements"] = {
        description: "Establish or review team agreements for human-LLM collaboration",
        template: COMMAND_TEMPLATE,
      }

      // If agreements file exists, ensure it's in instructions
      if (await fileExists(fullAgreementsPath)) {
        if (!config.instructions) {
          (config as any).instructions = []
        }
        const instructions = (config as any).instructions as string[]
        if (!instructions.includes(agreementsPath)) {
          instructions.unshift(agreementsPath) // Add at beginning for priority
        }
      }
    },

    /**
     * Tools for team agreements management
     */
    tool: {
      /**
       * Detect existing enforcement mechanisms in the project
       */
      detect_enforcement_mechanisms: tool({
        description:
          "Detect existing enforcement mechanisms in the project (pre-commit hooks, CI workflows, " +
          "linters, formatters, etc.). Use this before offering to set up enforcement for team agreements " +
          "to understand what's already in place and avoid duplicating or conflicting with existing tooling.",
        args: {},
        async execute() {
          const mechanisms = await detectEnforcementMechanisms(directory)
          return formatEnforcementResults(mechanisms)
        },
      }),

      /**
       * Suggest a new topic for the team-agreements plugin
       */
      suggest_team_agreement_topic: tool({
        description:
          "Suggest a new topic to be added to the team-agreements plugin. " +
          "This will file a GitHub issue on the plugin repository. " +
          "Requires the gh CLI to be installed and authenticated.",
        args: {
          topic_name: tool.schema
            .string()
            .describe("A short, descriptive name for the suggested topic"),
          description: tool.schema
            .string()
            .describe(
              "Why this topic is important for human-LLM collaboration and what it should cover"
            ),
          suggested_questions: tool.schema
            .array(tool.schema.string())
            .describe(
              "List of questions that should be asked when establishing agreements for this topic"
            ),
          example_agreement: tool.schema
            .string()
            .optional()
            .describe("Optional example of what a good agreement for this topic might look like"),
        },
        async execute(args) {
          // Check if gh is available
          if (!(await isGhAvailable())) {
            return (
              "The gh CLI is not installed or not authenticated. " +
              "Please install it from https://cli.github.com and run 'gh auth login', " +
              "or manually file an issue at: " +
              `https://github.com/${PLUGIN_REPO}/issues/new?template=topic-suggestion.md`
            )
          }

          const body = buildTopicIssueBody(args)

          try {
            const title = `[Topic] ${args.topic_name}`
            const { stdout } = await execAsync(
              `gh issue create --repo "${PLUGIN_REPO}" --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"').replace(/\n/g, "\\n")}" --label "enhancement,topic-suggestion"`
            )
            return `Successfully created issue: ${stdout.trim()}`
          } catch (error) {
            return `Failed to create issue: ${error}. You can manually file one at: https://github.com/${PLUGIN_REPO}/issues/new?template=topic-suggestion.md`
          }
        },
      }),
    },

    /**
     * Re-inject team agreements after context compaction.
     * This ensures LLM agents maintain awareness of agreements
     * even in long-running sessions.
     */
    "experimental.session.compacting": async (_input, output) => {
      const agreements = await loadTeamAgreements(directory)
      if (agreements) {
        output.context.push(agreements)
      }
    },
  }
}

export default TeamAgreementsPlugin
