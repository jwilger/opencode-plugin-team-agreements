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
  analyzeProject,
  formatProjectAnalysis,
  COMMAND_TEMPLATE,
  PLUGIN_REPO,
  type EnforcementMechanism,
  type ProjectAnalysis,
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
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it("returns formatted content when AGENTS.md exists", async () => {
    const agreementsContent = "# My Team Agreements\n\nWe agree to be awesome."
    await writeFile(join(testDir, "AGENTS.md"), agreementsContent)

    const result = await loadTeamAgreements(testDir)

    expect(result).not.toBeNull()
    expect(result).toContain("## Team Agreements")
    expect(result).toContain("from AGENTS.md")
    expect(result).toContain("The following team agreements are in effect")
    expect(result).toContain(agreementsContent)
  })

  it("returns formatted content from CLAUDE.md when AGENTS.md does not exist", async () => {
    const agreementsContent = "# Claude Rules\n\nBe helpful."
    await writeFile(join(testDir, "CLAUDE.md"), agreementsContent)

    const result = await loadTeamAgreements(testDir)

    expect(result).not.toBeNull()
    expect(result).toContain("## Team Agreements")
    expect(result).toContain("from CLAUDE.md")
    expect(result).toContain(agreementsContent)
  })

  it("prefers AGENTS.md over CLAUDE.md when both exist", async () => {
    await writeFile(join(testDir, "AGENTS.md"), "# AGENTS content")
    await writeFile(join(testDir, "CLAUDE.md"), "# CLAUDE content")

    const result = await loadTeamAgreements(testDir)

    expect(result).not.toBeNull()
    expect(result).toContain("from AGENTS.md")
    expect(result).toContain("# AGENTS content")
    expect(result).not.toContain("# CLAUDE content")
  })

  it("returns null when neither file exists", async () => {
    const result = await loadTeamAgreements(testDir)

    expect(result).toBeNull()
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
    expect(COMMAND_TEMPLATE).toContain("## Overview")
    expect(COMMAND_TEMPLATE).toContain("AGENTS.md")
    expect(COMMAND_TEMPLATE).toContain("## Step 1: Analyze Project & Existing Files")
    expect(COMMAND_TEMPLATE).toContain("## Step 2: Determine the Scenario")
    expect(COMMAND_TEMPLATE).toContain("## Step 3: Present Categories Based on Analysis")
    expect(COMMAND_TEMPLATE).toContain("## Step 4: Gather Team Agreements")
    // Categories
    expect(COMMAND_TEMPLATE).toContain("CATEGORY 1: CODE & QUALITY")
    expect(COMMAND_TEMPLATE).toContain("CATEGORY 2: INTEGRATION & DELIVERY")
    expect(COMMAND_TEMPLATE).toContain("CATEGORY 3: OPERATIONS & QA")
    expect(COMMAND_TEMPLATE).toContain("CATEGORY 4: DOCUMENTATION & KNOWLEDGE")
    expect(COMMAND_TEMPLATE).toContain("CATEGORY 5: AI/LLM COLLABORATION")
    expect(COMMAND_TEMPLATE).toContain("CATEGORY 6: TEAM PROCESS")
    expect(COMMAND_TEMPLATE).toContain("CATEGORY 7: GOVERNANCE")
    // Topics
    expect(COMMAND_TEMPLATE).toContain("Programming Languages")
    expect(COMMAND_TEMPLATE).toContain("Code Quality Standards")
    expect(COMMAND_TEMPLATE).toContain("Code Review Process")
    expect(COMMAND_TEMPLATE).toContain("Testing Requirements")
    expect(COMMAND_TEMPLATE).toContain("Version Control & Branching")
    expect(COMMAND_TEMPLATE).toContain("Security Practices")
    expect(COMMAND_TEMPLATE).toContain("AI Tools & Policies")
    expect(COMMAND_TEMPLATE).toContain("Autonomy Boundaries")
    expect(COMMAND_TEMPLATE).toContain("Amendment Process")
  })

  it("mentions the suggestion tool", () => {
    expect(COMMAND_TEMPLATE).toContain("suggest_team_agreement_topic")
  })

  it("mentions the analyze_project tool", () => {
    expect(COMMAND_TEMPLATE).toContain("analyze_project")
  })

  it("contains enforcement section", () => {
    expect(COMMAND_TEMPLATE).toContain("detect_enforcement_mechanisms")
    expect(COMMAND_TEMPLATE).toContain("Enforcement Mechanisms")
    expect(COMMAND_TEMPLATE).toContain("commitlint")
    expect(COMMAND_TEMPLATE).toContain("CI workflows")
    expect(COMMAND_TEMPLATE).toContain("branch protection")
  })

  it("contains merging guidelines section", () => {
    expect(COMMAND_TEMPLATE).toContain("## Step 5: Generate Documents")
    expect(COMMAND_TEMPLATE).toContain("### Merging Guidelines")
    expect(COMMAND_TEMPLATE).toContain("Preserve existing structure")
    expect(COMMAND_TEMPLATE).toContain("Avoid duplication")
  })

  it("contains CLAUDE.md coordination section", () => {
    expect(COMMAND_TEMPLATE).toContain("## Step 6: Handle CLAUDE.md Coordination")
    expect(COMMAND_TEMPLATE).toContain("@AGENTS.md")
    expect(COMMAND_TEMPLATE).toContain("Claude-specific")
  })

  it("contains AI/LLM collaboration topics", () => {
    expect(COMMAND_TEMPLATE).toContain("AI Tools & Policies")
    expect(COMMAND_TEMPLATE).toContain("Autonomy Boundaries")
    expect(COMMAND_TEMPLATE).toContain("AI Code Generation Standards")
    expect(COMMAND_TEMPLATE).toContain("Context & Session Management")
    expect(COMMAND_TEMPLATE).toContain("Human Oversight & Escalation")
    expect(COMMAND_TEMPLATE).toContain("Learning & Improvement")
  })

  it("contains progress tracking guidance", () => {
    expect(COMMAND_TEMPLATE).toContain("Category X of 7")
    expect(COMMAND_TEMPLATE).toContain("25-40 minutes")
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
    await mkdir(testDir, { recursive: true })
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

  it("does not inject instructions (AGENTS.md is auto-loaded by OpenCode)", async () => {
    // Note: We no longer inject AGENTS.md into instructions because OpenCode
    // automatically loads it from the project root
    await writeFile(join(testDir, "AGENTS.md"), "# Agreements")

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

    // Config should NOT have instructions added - AGENTS.md is auto-loaded
    expect(config.instructions).toBeUndefined()
  })

  it("provides compaction hook that injects agreements from AGENTS.md", async () => {
    await writeFile(join(testDir, "AGENTS.md"), "# Test Agreements")

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

  it("registers the analyze_project tool", async () => {
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
    expect(hooks.tool!.analyze_project).toBeDefined()
    expect(hooks.tool!.analyze_project.description).toContain("Analyze the project")
  })

  it("analyze_project tool returns formatted results", async () => {
    await writeFile(join(testDir, "package.json"), JSON.stringify({
      dependencies: { react: "^18.0.0", express: "^4.0.0" },
      devDependencies: { typescript: "^5.0.0", vitest: "^1.0.0" }
    }))

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
    const result = await hooks.tool!.analyze_project.execute({}, mockToolContext)

    expect(result).toContain("Project Analysis Results")
    expect(result).toContain("Languages")
    expect(result).toContain("Typescript")
    expect(result).toContain("Frameworks")
    expect(result).toContain("React")
  })
})

describe("analyzeProject", () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), "analyze-project-test-" + Date.now() + "-" + Math.random().toString(36).slice(2))
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it("returns default analysis for empty project", async () => {
    const result = await analyzeProject(testDir)

    expect(result.languages.typescript).toBe(false)
    expect(result.languages.javascript).toBe(false)
    expect(result.frameworks.react).toBe(false)
    expect(result.ci.githubActions).toBe(false)
    expect(result.aiTools.agentsMd).toBe(false)
    expect(result.recommendations.suggestedCategories).toContain("Code & Quality")
  })

  it("detects TypeScript from package.json", async () => {
    await writeFile(join(testDir, "package.json"), JSON.stringify({
      devDependencies: { typescript: "^5.0.0" }
    }))

    const result = await analyzeProject(testDir)

    expect(result.languages.typescript).toBe(true)
    expect(result.languages.javascript).toBe(true)
  })

  it("detects TypeScript from tsconfig.json", async () => {
    await writeFile(join(testDir, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022" }
    }))

    const result = await analyzeProject(testDir)

    expect(result.languages.typescript).toBe(true)
  })

  it("detects Python from pyproject.toml", async () => {
    await writeFile(join(testDir, "pyproject.toml"), "[project]\nname = 'test'")

    const result = await analyzeProject(testDir)

    expect(result.languages.python).toBe(true)
  })

  it("detects Rust from Cargo.toml", async () => {
    await writeFile(join(testDir, "Cargo.toml"), "[package]\nname = 'test'")

    const result = await analyzeProject(testDir)

    expect(result.languages.rust).toBe(true)
  })

  it("detects Go from go.mod", async () => {
    await writeFile(join(testDir, "go.mod"), "module example.com/test")

    const result = await analyzeProject(testDir)

    expect(result.languages.go).toBe(true)
  })

  it("detects React from package.json", async () => {
    await writeFile(join(testDir, "package.json"), JSON.stringify({
      dependencies: { react: "^18.0.0" }
    }))

    const result = await analyzeProject(testDir)

    expect(result.frameworks.react).toBe(true)
    expect(result.characteristics.hasFrontend).toBe(true)
  })

  it("detects Express from package.json", async () => {
    await writeFile(join(testDir, "package.json"), JSON.stringify({
      dependencies: { express: "^4.0.0" }
    }))

    const result = await analyzeProject(testDir)

    expect(result.frameworks.express).toBe(true)
    expect(result.characteristics.hasBackend).toBe(true)
    expect(result.characteristics.hasApi).toBe(true)
  })

  it("detects Next.js from package.json", async () => {
    await writeFile(join(testDir, "package.json"), JSON.stringify({
      dependencies: { next: "^14.0.0" }
    }))

    const result = await analyzeProject(testDir)

    expect(result.frameworks.nextjs).toBe(true)
    expect(result.characteristics.hasFrontend).toBe(true)
    expect(result.characteristics.hasBackend).toBe(true)
  })

  it("detects GitHub Actions", async () => {
    await mkdir(join(testDir, ".github", "workflows"), { recursive: true })

    const result = await analyzeProject(testDir)

    expect(result.ci.githubActions).toBe(true)
  })

  it("detects GitLab CI", async () => {
    await writeFile(join(testDir, ".gitlab-ci.yml"), "stages:\n  - build")

    const result = await analyzeProject(testDir)

    expect(result.ci.gitlabCi).toBe(true)
  })

  it("detects Jest from package.json", async () => {
    await writeFile(join(testDir, "package.json"), JSON.stringify({
      devDependencies: { jest: "^29.0.0" }
    }))

    const result = await analyzeProject(testDir)

    expect(result.testing.jest).toBe(true)
  })

  it("detects Vitest from package.json", async () => {
    await writeFile(join(testDir, "package.json"), JSON.stringify({
      devDependencies: { vitest: "^1.0.0" }
    }))

    const result = await analyzeProject(testDir)

    expect(result.testing.vitest).toBe(true)
  })

  it("detects pytest from conftest.py", async () => {
    await writeFile(join(testDir, "conftest.py"), "# pytest config")

    const result = await analyzeProject(testDir)

    expect(result.testing.pytest).toBe(true)
  })

  it("detects test directory", async () => {
    await mkdir(join(testDir, "tests"), { recursive: true })

    const result = await analyzeProject(testDir)

    expect(result.testing.hasTestDirectory).toBe(true)
  })

  it("detects AGENTS.md", async () => {
    await writeFile(join(testDir, "AGENTS.md"), "# Agent Instructions")

    const result = await analyzeProject(testDir)

    expect(result.aiTools.agentsMd).toBe(true)
  })

  it("detects CLAUDE.md", async () => {
    await writeFile(join(testDir, "CLAUDE.md"), "# Claude Instructions")

    const result = await analyzeProject(testDir)

    expect(result.aiTools.claudeMd).toBe(true)
  })

  it("detects GitHub Copilot instructions", async () => {
    await mkdir(join(testDir, ".github"), { recursive: true })
    await writeFile(join(testDir, ".github", "copilot-instructions.md"), "# Instructions")

    const result = await analyzeProject(testDir)

    expect(result.aiTools.copilotInstructions).toBe(true)
  })

  it("detects Cursor rules", async () => {
    await writeFile(join(testDir, ".cursorrules"), "# Rules")

    const result = await analyzeProject(testDir)

    expect(result.aiTools.cursorRules).toBe(true)
  })

  it("detects OpenCode config", async () => {
    await writeFile(join(testDir, "opencode.json"), '{}')

    const result = await analyzeProject(testDir)

    expect(result.aiTools.openCodeConfig).toBe(true)
  })

  it("detects Prisma", async () => {
    await mkdir(join(testDir, "prisma"), { recursive: true })

    const result = await analyzeProject(testDir)

    expect(result.database.prisma).toBe(true)
  })

  it("detects migrations directory", async () => {
    await mkdir(join(testDir, "migrations"), { recursive: true })

    const result = await analyzeProject(testDir)

    expect(result.database.hasMigrations).toBe(true)
  })

  it("detects Sentry from package.json", async () => {
    await writeFile(join(testDir, "package.json"), JSON.stringify({
      dependencies: { "@sentry/node": "^7.0.0" }
    }))

    const result = await analyzeProject(testDir)

    expect(result.monitoring.sentry).toBe(true)
  })

  it("detects Docker", async () => {
    await writeFile(join(testDir, "Dockerfile"), "FROM node:20")

    const result = await analyzeProject(testDir)

    expect(result.characteristics.hasDocker).toBe(true)
  })

  it("detects monorepo from workspaces", async () => {
    await writeFile(join(testDir, "package.json"), JSON.stringify({
      workspaces: ["packages/*"]
    }))

    const result = await analyzeProject(testDir)

    expect(result.characteristics.isMonorepo).toBe(true)
  })

  it("detects library from package.json exports", async () => {
    await writeFile(join(testDir, "package.json"), JSON.stringify({
      main: "dist/index.js",
      exports: { ".": "./dist/index.js" }
    }))

    const result = await analyzeProject(testDir)

    expect(result.characteristics.isLibrary).toBe(true)
  })

  it("highlights AI collaboration when AI tools detected", async () => {
    await writeFile(join(testDir, "AGENTS.md"), "# Instructions")

    const result = await analyzeProject(testDir)

    expect(result.recommendations.highlightedTopics).toContain("AI/LLM Collaboration")
  })

  it("marks database topics as skippable when no database", async () => {
    const result = await analyzeProject(testDir)

    expect(result.recommendations.skippableTopics).toContain("Database & Schema Changes")
  })

  it("marks a11y as skippable when no frontend", async () => {
    await writeFile(join(testDir, "package.json"), JSON.stringify({
      dependencies: { express: "^4.0.0" }
    }))

    const result = await analyzeProject(testDir)

    expect(result.recommendations.skippableTopics).toContain("Accessibility & Internationalization")
  })
})

describe("formatProjectAnalysis", () => {
  it("formats empty analysis", () => {
    const analysis: ProjectAnalysis = {
      languages: { typescript: false, javascript: false, python: false, rust: false, go: false, ruby: false, java: false, csharp: false, other: [] },
      frameworks: { react: false, vue: false, angular: false, nextjs: false, express: false, fastapi: false, django: false, rails: false, springBoot: false, other: [] },
      ci: { githubActions: false, gitlabCi: false, circleCi: false, jenkins: false, other: [] },
      testing: { jest: false, vitest: false, mocha: false, pytest: false, rspec: false, goTest: false, hasTestDirectory: false, other: [] },
      aiTools: { agentsMd: false, claudeMd: false, copilotInstructions: false, cursorRules: false, continueConfig: false, openCodeConfig: false },
      database: { prisma: false, sequelize: false, typeorm: false, drizzle: false, sqlalchemy: false, activeRecord: false, hasMigrations: false, other: [] },
      monitoring: { sentry: false, datadog: false, newRelic: false, prometheus: false, other: [] },
      characteristics: { isMonorepo: false, isLibrary: false, hasDocker: false, hasFrontend: false, hasBackend: false, hasApi: false, hasDocs: false },
      recommendations: { suggestedCategories: ["Code & Quality"], highlightedTopics: [], skippableTopics: [] }
    }

    const result = formatProjectAnalysis(analysis)

    expect(result).toContain("Project Analysis Results")
    expect(result).toContain("Recommendations")
    expect(result).toContain("Code & Quality")
  })

  it("formats languages section", () => {
    const analysis: ProjectAnalysis = {
      languages: { typescript: true, javascript: true, python: false, rust: false, go: false, ruby: false, java: false, csharp: false, other: [] },
      frameworks: { react: false, vue: false, angular: false, nextjs: false, express: false, fastapi: false, django: false, rails: false, springBoot: false, other: [] },
      ci: { githubActions: false, gitlabCi: false, circleCi: false, jenkins: false, other: [] },
      testing: { jest: false, vitest: false, mocha: false, pytest: false, rspec: false, goTest: false, hasTestDirectory: false, other: [] },
      aiTools: { agentsMd: false, claudeMd: false, copilotInstructions: false, cursorRules: false, continueConfig: false, openCodeConfig: false },
      database: { prisma: false, sequelize: false, typeorm: false, drizzle: false, sqlalchemy: false, activeRecord: false, hasMigrations: false, other: [] },
      monitoring: { sentry: false, datadog: false, newRelic: false, prometheus: false, other: [] },
      characteristics: { isMonorepo: false, isLibrary: false, hasDocker: false, hasFrontend: false, hasBackend: false, hasApi: false, hasDocs: false },
      recommendations: { suggestedCategories: [], highlightedTopics: [], skippableTopics: [] }
    }

    const result = formatProjectAnalysis(analysis)

    expect(result).toContain("### Languages")
    expect(result).toContain("Typescript")
    expect(result).toContain("Javascript")
  })

  it("formats frameworks section", () => {
    const analysis: ProjectAnalysis = {
      languages: { typescript: false, javascript: false, python: false, rust: false, go: false, ruby: false, java: false, csharp: false, other: [] },
      frameworks: { react: true, vue: false, angular: false, nextjs: false, express: true, fastapi: false, django: false, rails: false, springBoot: false, other: [] },
      ci: { githubActions: false, gitlabCi: false, circleCi: false, jenkins: false, other: [] },
      testing: { jest: false, vitest: false, mocha: false, pytest: false, rspec: false, goTest: false, hasTestDirectory: false, other: [] },
      aiTools: { agentsMd: false, claudeMd: false, copilotInstructions: false, cursorRules: false, continueConfig: false, openCodeConfig: false },
      database: { prisma: false, sequelize: false, typeorm: false, drizzle: false, sqlalchemy: false, activeRecord: false, hasMigrations: false, other: [] },
      monitoring: { sentry: false, datadog: false, newRelic: false, prometheus: false, other: [] },
      characteristics: { isMonorepo: false, isLibrary: false, hasDocker: false, hasFrontend: false, hasBackend: false, hasApi: false, hasDocs: false },
      recommendations: { suggestedCategories: [], highlightedTopics: [], skippableTopics: [] }
    }

    const result = formatProjectAnalysis(analysis)

    expect(result).toContain("### Frameworks")
    expect(result).toContain("React")
    expect(result).toContain("Express")
  })

  it("formats AI tools section", () => {
    const analysis: ProjectAnalysis = {
      languages: { typescript: false, javascript: false, python: false, rust: false, go: false, ruby: false, java: false, csharp: false, other: [] },
      frameworks: { react: false, vue: false, angular: false, nextjs: false, express: false, fastapi: false, django: false, rails: false, springBoot: false, other: [] },
      ci: { githubActions: false, gitlabCi: false, circleCi: false, jenkins: false, other: [] },
      testing: { jest: false, vitest: false, mocha: false, pytest: false, rspec: false, goTest: false, hasTestDirectory: false, other: [] },
      aiTools: { agentsMd: true, claudeMd: false, copilotInstructions: true, cursorRules: false, continueConfig: false, openCodeConfig: false },
      database: { prisma: false, sequelize: false, typeorm: false, drizzle: false, sqlalchemy: false, activeRecord: false, hasMigrations: false, other: [] },
      monitoring: { sentry: false, datadog: false, newRelic: false, prometheus: false, other: [] },
      characteristics: { isMonorepo: false, isLibrary: false, hasDocker: false, hasFrontend: false, hasBackend: false, hasApi: false, hasDocs: false },
      recommendations: { suggestedCategories: [], highlightedTopics: [], skippableTopics: [] }
    }

    const result = formatProjectAnalysis(analysis)

    expect(result).toContain("### AI Tools Configuration")
    expect(result).toContain("AGENTS.md")
    expect(result).toContain("GitHub Copilot instructions")
  })

  it("shows no CI message when not detected", () => {
    const analysis: ProjectAnalysis = {
      languages: { typescript: false, javascript: false, python: false, rust: false, go: false, ruby: false, java: false, csharp: false, other: [] },
      frameworks: { react: false, vue: false, angular: false, nextjs: false, express: false, fastapi: false, django: false, rails: false, springBoot: false, other: [] },
      ci: { githubActions: false, gitlabCi: false, circleCi: false, jenkins: false, other: [] },
      testing: { jest: false, vitest: false, mocha: false, pytest: false, rspec: false, goTest: false, hasTestDirectory: false, other: [] },
      aiTools: { agentsMd: false, claudeMd: false, copilotInstructions: false, cursorRules: false, continueConfig: false, openCodeConfig: false },
      database: { prisma: false, sequelize: false, typeorm: false, drizzle: false, sqlalchemy: false, activeRecord: false, hasMigrations: false, other: [] },
      monitoring: { sentry: false, datadog: false, newRelic: false, prometheus: false, other: [] },
      characteristics: { isMonorepo: false, isLibrary: false, hasDocker: false, hasFrontend: false, hasBackend: false, hasApi: false, hasDocs: false },
      recommendations: { suggestedCategories: [], highlightedTopics: [], skippableTopics: [] }
    }

    const result = formatProjectAnalysis(analysis)

    expect(result).toContain("No CI/CD detected")
  })

  it("formats highlighted topics", () => {
    const analysis: ProjectAnalysis = {
      languages: { typescript: false, javascript: false, python: false, rust: false, go: false, ruby: false, java: false, csharp: false, other: [] },
      frameworks: { react: false, vue: false, angular: false, nextjs: false, express: false, fastapi: false, django: false, rails: false, springBoot: false, other: [] },
      ci: { githubActions: false, gitlabCi: false, circleCi: false, jenkins: false, other: [] },
      testing: { jest: false, vitest: false, mocha: false, pytest: false, rspec: false, goTest: false, hasTestDirectory: false, other: [] },
      aiTools: { agentsMd: false, claudeMd: false, copilotInstructions: false, cursorRules: false, continueConfig: false, openCodeConfig: false },
      database: { prisma: false, sequelize: false, typeorm: false, drizzle: false, sqlalchemy: false, activeRecord: false, hasMigrations: false, other: [] },
      monitoring: { sentry: false, datadog: false, newRelic: false, prometheus: false, other: [] },
      characteristics: { isMonorepo: false, isLibrary: false, hasDocker: false, hasFrontend: false, hasBackend: false, hasApi: false, hasDocs: false },
      recommendations: { suggestedCategories: [], highlightedTopics: ["AI/LLM Collaboration", "Security"], skippableTopics: [] }
    }

    const result = formatProjectAnalysis(analysis)

    expect(result).toContain("Topics to highlight")
    expect(result).toContain("AI/LLM Collaboration")
    expect(result).toContain("Security")
  })

  it("formats skippable topics", () => {
    const analysis: ProjectAnalysis = {
      languages: { typescript: false, javascript: false, python: false, rust: false, go: false, ruby: false, java: false, csharp: false, other: [] },
      frameworks: { react: false, vue: false, angular: false, nextjs: false, express: false, fastapi: false, django: false, rails: false, springBoot: false, other: [] },
      ci: { githubActions: false, gitlabCi: false, circleCi: false, jenkins: false, other: [] },
      testing: { jest: false, vitest: false, mocha: false, pytest: false, rspec: false, goTest: false, hasTestDirectory: false, other: [] },
      aiTools: { agentsMd: false, claudeMd: false, copilotInstructions: false, cursorRules: false, continueConfig: false, openCodeConfig: false },
      database: { prisma: false, sequelize: false, typeorm: false, drizzle: false, sqlalchemy: false, activeRecord: false, hasMigrations: false, other: [] },
      monitoring: { sentry: false, datadog: false, newRelic: false, prometheus: false, other: [] },
      characteristics: { isMonorepo: false, isLibrary: false, hasDocker: false, hasFrontend: false, hasBackend: false, hasApi: false, hasDocs: false },
      recommendations: { suggestedCategories: [], highlightedTopics: [], skippableTopics: ["Database & Schema Changes"] }
    }

    const result = formatProjectAnalysis(analysis)

    expect(result).toContain("Topics that may be skippable")
    expect(result).toContain("Database & Schema Changes")
  })
})
