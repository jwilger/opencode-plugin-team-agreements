import type { Plugin } from "@opencode-ai/plugin"
import { readFile } from "fs/promises"
import { join } from "path"

const COMMAND_TEMPLATE = `You are helping establish or review team agreements for this project. Team agreements define how humans and LLM agents collaborate on the codebase.

User's request: $ARGUMENTS

## Instructions

1. First, check if team agreements already exist at \`docs/TEAM_AGREEMENTS.md\`

2. If agreements exist, present the user with options:
   - **Review**: Display the current agreements
   - **Amend**: Modify a specific section
   - **Start Over**: Begin fresh (with confirmation)

3. If no agreements exist (or starting over), guide the user through establishing agreements one topic at a time. Start with these core topics:

   a. **Storage Location** - Where should agreements be stored?
   b. **Programming Languages** - What languages and their purposes?
   c. **Code Quality Standards** - What makes "great" code?
   d. **Commit Message Conventions** - Format and requirements?
   e. **Integration Workflow** - How is code integrated?
   f. **Testing Requirements** - What testing is required?
   g. **Amendment Process** - How are these agreements changed?

4. For each topic:
   - Ask one question at a time
   - Discuss trade-offs when relevant
   - Confirm understanding before moving on

5. **After the core topics**, ask:
   "Are there any additional topics you'd like to establish agreements for?"
   
   Suggest potential additional topics if helpful:
   - Architecture decision records (ADRs)
   - Dependency management
   - Documentation standards
   - Error handling conventions
   - Naming conventions
   - LLM autonomy boundaries (what can LLMs do without asking?)
   - Session handoff protocols
   - Code review process
   - Planning and work breakdown
   - Information sharing across sessions
   
   Continue asking about each additional topic the user wants to cover.

6. After ALL topics (core + additional) are covered:
   - Generate a \`docs/TEAM_AGREEMENTS.md\` file
   - Update \`opencode.json\` to include agreements in the \`instructions\` array
   - Summarize what was established

## Important

- Be conversational and collaborative
- One question at a time - don't overwhelm
- Respect the user's expertise and preferences
- If the user provides a specific request in their message, address that first
- The core topics are a starting point, not an exhaustive list`

/**
 * Load team agreements from the project directory.
 * Returns the content if found, null otherwise.
 */
async function loadTeamAgreements(directory: string): Promise<string | null> {
  // TODO: Read the actual storage location from the agreements file or config
  const defaultPath = join(directory, "docs", "TEAM_AGREEMENTS.md")

  try {
    const content = await readFile(defaultPath, "utf-8")
    return `## Team Agreements\n\nThe following team agreements are in effect for this project:\n\n${content}`
  } catch {
    // File doesn't exist yet
    return null
  }
}

/**
 * TeamAgreementsPlugin - Helps teams establish and maintain shared agreements
 * for human-LLM collaboration on a codebase.
 */
export const TeamAgreementsPlugin: Plugin = async (ctx) => {
  const { directory } = ctx

  return {
    /**
     * Inject command definition into config
     */
    config: async (config) => {
      // Mutate the config to add our command
      if (!config.command) {
        (config as any).command = {}
      }
      (config as any).command["team-agreements"] = {
        description: "Establish or review team agreements for human-LLM collaboration",
        template: COMMAND_TEMPLATE,
      }
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
