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
     * Custom tool to suggest a topic for the team-agreements plugin
     */
    tool: {
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
