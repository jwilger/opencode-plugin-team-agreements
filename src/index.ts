/**
 * OpenCode Team Agreements Plugin
 *
 * Helps teams establish and maintain shared agreements for human-LLM collaboration.
 *
 * IMPORTANT: Only the plugin function should be exported from this module.
 * OpenCode's plugin loader iterates through all exports and tries to call each
 * one as a plugin function. Exporting non-function values (like strings or objects)
 * will cause a crash.
 *
 * @packageDocumentation
 */

import { type Plugin, tool } from "@opencode-ai/plugin"

import {
  COMMAND_TEMPLATE,
  PLUGIN_REPO,
  isGhAvailable,
  loadTeamAgreements,
  buildTopicIssueBody,
  detectEnforcementMechanisms,
  formatEnforcementResults,
  execAsync,
} from "./utils.js"

/**
 * TeamAgreementsPlugin - Helps teams establish and maintain shared agreements
 * for human-LLM collaboration on a codebase.
 *
 * Team agreements are stored in AGENTS.md (or CLAUDE.md as fallback) in the
 * project root. These files are automatically loaded by OpenCode and Claude Code,
 * so no config injection is needed.
 */
export const TeamAgreementsPlugin: Plugin = async (ctx) => {
  const { directory } = ctx

  return {
    /**
     * Register the /team-agreements command.
     * Note: We no longer inject AGENTS.md into instructions because OpenCode
     * automatically loads it from the project root.
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
