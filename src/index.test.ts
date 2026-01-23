import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdir, writeFile, rm } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { TeamAgreementsPlugin } from "./index.js"
import {
  fileExists,
  loadTeamAgreements,
  formatQuestionsAsMarkdown,
  buildTopicIssueBody,
  detectEnforcementMechanisms,
  formatEnforcementResults,
  COMMAND_TEMPLATE,
  PLUGIN_REPO,
  type EnforcementMechanism,
} from "./utils.js"

describe("fileExists", () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), "team-agreements-test-" + Date.now() + "-" + Math.random().toString(36).slice(2))
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it("returns true for existing file", async () => {
    const filePath = join(testDir, "test.txt")
    await writeFile(filePath, "test content")

    expect(await fileExists(filePath)).toBe(true)
  })

  it("returns false for non-existing file", async () => {
    const filePath = join(testDir, "non-existent.txt")

    expect(await fileExists(filePath)).toBe(false)
  })

  it("returns true for existing directory", async () => {
    expect(await fileExists(testDir)).toBe(true)
  })
})

describe("loadTeamAgreements", () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), "team-agreements-test-" + Date.now() + "-" + Math.random().toString(36).slice(2))
    await mkdir(join(testDir, "docs"), { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it("returns formatted content when agreements file exists", async () => {
    const agreementsContent = "# My Team Agreements\n\nWe agree to be awesome."
    await writeFile(join(testDir, "docs", "TEAM_AGREEMENTS.md"), agreementsContent)

    const result = await loadTeamAgreements(testDir)

    expect(result).not.toBeNull()
    expect(result).toContain("## Team Agreements")
    expect(result).toContain("The following team agreements are in effect")
    expect(result).toContain(agreementsContent)
  })

  it("returns null when agreements file does not exist", async () => {
    const result = await loadTeamAgreements(testDir)

    expect(result).toBeNull()
  })

  it("returns null when docs directory does not exist", async () => {
    const emptyDir = join(tmpdir(), "empty-test-" + Date.now())
    await mkdir(emptyDir, { recursive: true })

    try {
      const result = await loadTeamAgreements(emptyDir)
      expect(result).toBeNull()
    } finally {
      await rm(emptyDir, { recursive: true, force: true })
    }
  })
})

describe("formatQuestionsAsMarkdown", () => {
  it("formats single question", () => {
    const result = formatQuestionsAsMarkdown(["What is your name?"])
    expect(result).toBe("- What is your name?")
  })

  it("formats multiple questions", () => {
    const result = formatQuestionsAsMarkdown([
      "What is your name?",
      "What is your quest?",
      "What is your favorite color?",
    ])
    expect(result).toBe(
      "- What is your name?\n- What is your quest?\n- What is your favorite color?"
    )
  })

  it("handles empty array", () => {
    const result = formatQuestionsAsMarkdown([])
    expect(result).toBe("")
  })
})

describe("buildTopicIssueBody", () => {
  it("builds complete issue body with all fields", () => {
    const result = buildTopicIssueBody({
      topic_name: "Security Practices",
      description: "How to handle security concerns",
      suggested_questions: ["Do we need code scanning?", "What about secrets management?"],
      example_agreement: "All PRs must pass security scans",
    })

    expect(result).toContain("## Topic Name")
    expect(result).toContain("Security Practices")
    expect(result).toContain("## Description")
    expect(result).toContain("How to handle security concerns")
    expect(result).toContain("## Suggested Questions")
    expect(result).toContain("- Do we need code scanning?")
    expect(result).toContain("- What about secrets management?")
    expect(result).toContain("## Example Agreement")
    expect(result).toContain("All PRs must pass security scans")
    expect(result).toContain("automatically created via the team-agreements plugin")
  })

  it("handles missing example_agreement", () => {
    const result = buildTopicIssueBody({
      topic_name: "Test Topic",
      description: "Test description",
      suggested_questions: ["Question 1"],
    })

    expect(result).toContain("_No example provided_")
  })
})

describe("COMMAND_TEMPLATE", () => {
  it("contains required sections", () => {
    expect(COMMAND_TEMPLATE).toContain("$ARGUMENTS")
    expect(COMMAND_TEMPLATE).toContain("## Instructions")
    expect(COMMAND_TEMPLATE).toContain("Storage Location")
    expect(COMMAND_TEMPLATE).toContain("Programming Languages")
    expect(COMMAND_TEMPLATE).toContain("Code Quality Standards")
    expect(COMMAND_TEMPLATE).toContain("Commit Message Conventions")
    expect(COMMAND_TEMPLATE).toContain("Integration Workflow")
    expect(COMMAND_TEMPLATE).toContain("Testing Requirements")
    expect(COMMAND_TEMPLATE).toContain("Amendment Process")
  })

  it("mentions the suggestion tool", () => {
    expect(COMMAND_TEMPLATE).toContain("suggest_team_agreement_topic")
  })

  it("contains enforcement section", () => {
    expect(COMMAND_TEMPLATE).toContain("detect_enforcement_mechanisms")
    expect(COMMAND_TEMPLATE).toContain("Enforcement Mechanisms")
    expect(COMMAND_TEMPLATE).toContain("Pre-commit Hooks")
    expect(COMMAND_TEMPLATE).toContain("CI Workflows")
    expect(COMMAND_TEMPLATE).toContain("GitHub Rulesets")
    expect(COMMAND_TEMPLATE).toContain("OpenCode Plugin Hooks")
  })
})

describe("detectEnforcementMechanisms", () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), "enforcement-test-" + Date.now() + "-" + Math.random().toString(36).slice(2))
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it("returns empty array for project with no enforcement", async () => {
    const result = await detectEnforcementMechanisms(testDir)
    expect(result).toEqual([])
  })

  it("detects husky pre-commit hooks", async () => {
    await mkdir(join(testDir, ".husky"), { recursive: true })

    const result = await detectEnforcementMechanisms(testDir)

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "pre-commit",
        name: "husky",
        detected: true,
      })
    )
  })

  it("detects lefthook", async () => {
    await writeFile(join(testDir, "lefthook.yml"), "pre-commit:\n  commands: []")

    const result = await detectEnforcementMechanisms(testDir)

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "pre-commit",
        name: "lefthook",
        detected: true,
      })
    )
  })

  it("detects commitlint", async () => {
    await writeFile(
      join(testDir, "commitlint.config.js"),
      "module.exports = { extends: ['@commitlint/config-conventional'] }"
    )

    const result = await detectEnforcementMechanisms(testDir)

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "commit-validation",
        name: "commitlint",
        detected: true,
      })
    )
  })

  it("detects eslint", async () => {
    await writeFile(join(testDir, ".eslintrc.json"), '{ "extends": "eslint:recommended" }')

    const result = await detectEnforcementMechanisms(testDir)

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "linter",
        name: "eslint",
        detected: true,
      })
    )
  })

  it("detects biome", async () => {
    await writeFile(join(testDir, "biome.json"), '{ "formatter": { "enabled": true } }')

    const result = await detectEnforcementMechanisms(testDir)

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "linter",
        name: "biome",
        detected: true,
      })
    )
  })

  it("detects GitHub Actions", async () => {
    await mkdir(join(testDir, ".github", "workflows"), { recursive: true })

    const result = await detectEnforcementMechanisms(testDir)

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "ci",
        name: "github-actions",
        detected: true,
      })
    )
  })

  it("detects GitHub PR templates", async () => {
    await mkdir(join(testDir, ".github"), { recursive: true })
    await writeFile(join(testDir, ".github", "pull_request_template.md"), "## Description")

    const result = await detectEnforcementMechanisms(testDir)

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "pr-template",
        name: "github-pr-template",
        detected: true,
      })
    )
  })

  it("detects opencode.json", async () => {
    await writeFile(join(testDir, "opencode.json"), '{ "instructions": [] }')

    const result = await detectEnforcementMechanisms(testDir)

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "opencode",
        name: "opencode-config",
        detected: true,
      })
    )
  })

  it("detects prettier", async () => {
    await writeFile(join(testDir, ".prettierrc"), '{ "semi": true }')

    const result = await detectEnforcementMechanisms(testDir)

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "formatter",
        name: "prettier",
        detected: true,
      })
    )
  })

  it("detects multiple mechanisms", async () => {
    await mkdir(join(testDir, ".husky"), { recursive: true })
    await mkdir(join(testDir, ".github", "workflows"), { recursive: true })
    await writeFile(join(testDir, "biome.json"), "{}")

    const result = await detectEnforcementMechanisms(testDir)

    expect(result.length).toBeGreaterThanOrEqual(3)
    expect(result.map((m: EnforcementMechanism) => m.name)).toContain("husky")
    expect(result.map((m: EnforcementMechanism) => m.name)).toContain("github-actions")
    expect(result.map((m: EnforcementMechanism) => m.name)).toContain("biome")
  })
})

describe("formatEnforcementResults", () => {
  it("formats empty results with suggestions", () => {
    const result = formatEnforcementResults([])

    expect(result).toContain("No existing enforcement mechanisms detected")
    expect(result).toContain("Available Options")
    expect(result).toContain("husky")
    expect(result).toContain("commitlint")
    expect(result).toContain("GitHub Actions")
  })

  it("formats detected mechanisms grouped by type", () => {
    const result = formatEnforcementResults([
      {
        type: "pre-commit",
        name: "husky",
        detected: true,
        configFile: ".husky/",
        notes: "Git hooks manager",
      },
      {
        type: "linter",
        name: "eslint",
        detected: true,
        configFile: ".eslintrc.json",
        notes: "JS linter",
      },
    ])

    expect(result).toContain("Detected Enforcement Mechanisms")
    expect(result).toContain("Pre-commit Hooks")
    expect(result).toContain("**husky**")
    expect(result).toContain("Linters")
    expect(result).toContain("**eslint**")
    expect(result).toContain("Recommendations")
  })
})

describe("PLUGIN_REPO", () => {
  it("has correct value", () => {
    expect(PLUGIN_REPO).toBe("jwilger/opencode-plugin-team-agreements")
  })
})

describe("TeamAgreementsPlugin", () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), "team-agreements-plugin-test-" + Date.now() + "-" + Math.random().toString(36).slice(2))
    await mkdir(join(testDir, "docs"), { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it("registers the team-agreements command via config hook", async () => {
    const mockCtx = {
      directory: testDir,
      client: {},
      project: {},
      worktree: testDir,
      serverUrl: new URL("http://localhost"),
      $: {} as any,
    }

    const hooks = await TeamAgreementsPlugin(mockCtx as any)
    const config: any = {}

    await hooks.config!(config)

    expect(config.command).toBeDefined()
    expect(config.command["team-agreements"]).toBeDefined()
    expect(config.command["team-agreements"].description).toContain("team agreements")
    expect(config.command["team-agreements"].template).toBe(COMMAND_TEMPLATE)
  })

  it("adds agreements to instructions when file exists", async () => {
    await writeFile(join(testDir, "docs", "TEAM_AGREEMENTS.md"), "# Agreements")

    const mockCtx = {
      directory: testDir,
      client: {},
      project: {},
      worktree: testDir,
      serverUrl: new URL("http://localhost"),
      $: {} as any,
    }

    const hooks = await TeamAgreementsPlugin(mockCtx as any)
    const config: any = {}

    await hooks.config!(config)

    expect(config.instructions).toBeDefined()
    expect(config.instructions).toContain("docs/TEAM_AGREEMENTS.md")
  })

  it("does not add instructions when agreements file does not exist", async () => {
    const mockCtx = {
      directory: testDir,
      client: {},
      project: {},
      worktree: testDir,
      serverUrl: new URL("http://localhost"),
      $: {} as any,
    }

    const hooks = await TeamAgreementsPlugin(mockCtx as any)
    const config: any = {}

    await hooks.config!(config)

    expect(config.instructions).toBeUndefined()
  })

  it("does not duplicate instructions if already present", async () => {
    await writeFile(join(testDir, "docs", "TEAM_AGREEMENTS.md"), "# Agreements")

    const mockCtx = {
      directory: testDir,
      client: {},
      project: {},
      worktree: testDir,
      serverUrl: new URL("http://localhost"),
      $: {} as any,
    }

    const hooks = await TeamAgreementsPlugin(mockCtx as any)
    const config: any = {
      instructions: ["docs/TEAM_AGREEMENTS.md", "other-file.md"],
    }

    await hooks.config!(config)

    const count = config.instructions.filter(
      (i: string) => i === "docs/TEAM_AGREEMENTS.md"
    ).length
    expect(count).toBe(1)
  })

  it("provides compaction hook that injects agreements", async () => {
    await writeFile(join(testDir, "docs", "TEAM_AGREEMENTS.md"), "# Test Agreements")

    const mockCtx = {
      directory: testDir,
      client: {},
      project: {},
      worktree: testDir,
      serverUrl: new URL("http://localhost"),
      $: {} as any,
    }

    const hooks = await TeamAgreementsPlugin(mockCtx as any)
    const output = { context: [] as string[], prompt: undefined }

    await hooks["experimental.session.compacting"]!({ sessionID: "test" }, output)

    expect(output.context.length).toBe(1)
    expect(output.context[0]).toContain("Team Agreements")
    expect(output.context[0]).toContain("# Test Agreements")
  })

  it("compaction hook does nothing when no agreements file", async () => {
    const mockCtx = {
      directory: testDir,
      client: {},
      project: {},
      worktree: testDir,
      serverUrl: new URL("http://localhost"),
      $: {} as any,
    }

    const hooks = await TeamAgreementsPlugin(mockCtx as any)
    const output = { context: [] as string[], prompt: undefined }

    await hooks["experimental.session.compacting"]!({ sessionID: "test" }, output)

    expect(output.context.length).toBe(0)
  })

  it("registers the suggest_team_agreement_topic tool", async () => {
    const mockCtx = {
      directory: testDir,
      client: {},
      project: {},
      worktree: testDir,
      serverUrl: new URL("http://localhost"),
      $: {} as any,
    }

    const hooks = await TeamAgreementsPlugin(mockCtx as any)

    expect(hooks.tool).toBeDefined()
    expect(hooks.tool!.suggest_team_agreement_topic).toBeDefined()
    expect(hooks.tool!.suggest_team_agreement_topic.description).toContain("Suggest a new topic")
  })

  it("registers the detect_enforcement_mechanisms tool", async () => {
    const mockCtx = {
      directory: testDir,
      client: {},
      project: {},
      worktree: testDir,
      serverUrl: new URL("http://localhost"),
      $: {} as any,
    }

    const hooks = await TeamAgreementsPlugin(mockCtx as any)

    expect(hooks.tool).toBeDefined()
    expect(hooks.tool!.detect_enforcement_mechanisms).toBeDefined()
    expect(hooks.tool!.detect_enforcement_mechanisms.description).toContain("enforcement mechanisms")
  })

  it("detect_enforcement_mechanisms tool returns formatted results", async () => {
    await mkdir(join(testDir, ".husky"), { recursive: true })

    const mockCtx = {
      directory: testDir,
      client: {},
      project: {},
      worktree: testDir,
      serverUrl: new URL("http://localhost"),
      $: {} as any,
    }

    const mockToolContext = {
      sessionID: "test-session",
      messageID: "test-message",
      agent: "test-agent",
      abort: new AbortController().signal,
      metadata: () => {},
      ask: async () => {},
    }

    const hooks = await TeamAgreementsPlugin(mockCtx as any)
    const result = await hooks.tool!.detect_enforcement_mechanisms.execute({}, mockToolContext)

    expect(result).toContain("Detected Enforcement Mechanisms")
    expect(result).toContain("husky")
  })
})
