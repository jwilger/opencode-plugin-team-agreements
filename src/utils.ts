/**
 * Internal utility functions for the team-agreements plugin.
 *
 * NOTE: These are intentionally NOT exported from the main module entry point
 * because OpenCode's plugin loader iterates through all exports and tries to
 * call them as plugin functions. Only the plugin function should be exported
 * from the main entry point.
 */

import { readFile, access, readdir } from "fs/promises"
import { join } from "path"
import { exec } from "child_process"
import { promisify } from "util"

export const execAsync = promisify(exec)

/**
 * Project analysis result used to tailor team agreement questions.
 */
export interface ProjectAnalysis {
  // Languages detected
  languages: {
    typescript: boolean
    javascript: boolean
    python: boolean
    rust: boolean
    go: boolean
    ruby: boolean
    java: boolean
    csharp: boolean
    other: string[]
  }

  // Frameworks and libraries
  frameworks: {
    react: boolean
    vue: boolean
    angular: boolean
    nextjs: boolean
    express: boolean
    fastapi: boolean
    django: boolean
    rails: boolean
    springBoot: boolean
    other: string[]
  }

  // CI/CD
  ci: {
    githubActions: boolean
    gitlabCi: boolean
    circleCi: boolean
    jenkins: boolean
    other: string[]
  }

  // Testing
  testing: {
    jest: boolean
    vitest: boolean
    mocha: boolean
    pytest: boolean
    rspec: boolean
    goTest: boolean
    hasTestDirectory: boolean
    other: string[]
  }

  // AI Tools
  aiTools: {
    agentsMd: boolean
    claudeMd: boolean
    copilotInstructions: boolean
    cursorRules: boolean
    continueConfig: boolean
    openCodeConfig: boolean
  }

  // Database
  database: {
    prisma: boolean
    sequelize: boolean
    typeorm: boolean
    drizzle: boolean
    sqlalchemy: boolean
    activeRecord: boolean
    hasMigrations: boolean
    other: string[]
  }

  // Monitoring/Observability
  monitoring: {
    sentry: boolean
    datadog: boolean
    newRelic: boolean
    prometheus: boolean
    other: string[]
  }

  // Project characteristics
  characteristics: {
    isMonorepo: boolean
    isLibrary: boolean
    hasDocker: boolean
    hasFrontend: boolean
    hasBackend: boolean
    hasApi: boolean
    hasDocs: boolean
  }

  // Recommendations based on analysis
  recommendations: {
    suggestedCategories: string[]
    highlightedTopics: string[]
    skippableTopics: string[]
  }
}

/**
 * Analyze a project directory to detect languages, frameworks, tools, etc.
 * Used to tailor team agreement questions to the specific project.
 */
export async function analyzeProject(
  directory: string
): Promise<ProjectAnalysis> {
  const analysis: ProjectAnalysis = {
    languages: {
      typescript: false,
      javascript: false,
      python: false,
      rust: false,
      go: false,
      ruby: false,
      java: false,
      csharp: false,
      other: [],
    },
    frameworks: {
      react: false,
      vue: false,
      angular: false,
      nextjs: false,
      express: false,
      fastapi: false,
      django: false,
      rails: false,
      springBoot: false,
      other: [],
    },
    ci: {
      githubActions: false,
      gitlabCi: false,
      circleCi: false,
      jenkins: false,
      other: [],
    },
    testing: {
      jest: false,
      vitest: false,
      mocha: false,
      pytest: false,
      rspec: false,
      goTest: false,
      hasTestDirectory: false,
      other: [],
    },
    aiTools: {
      agentsMd: false,
      claudeMd: false,
      copilotInstructions: false,
      cursorRules: false,
      continueConfig: false,
      openCodeConfig: false,
    },
    database: {
      prisma: false,
      sequelize: false,
      typeorm: false,
      drizzle: false,
      sqlalchemy: false,
      activeRecord: false,
      hasMigrations: false,
      other: [],
    },
    monitoring: {
      sentry: false,
      datadog: false,
      newRelic: false,
      prometheus: false,
      other: [],
    },
    characteristics: {
      isMonorepo: false,
      isLibrary: false,
      hasDocker: false,
      hasFrontend: false,
      hasBackend: false,
      hasApi: false,
      hasDocs: false,
    },
    recommendations: {
      suggestedCategories: [],
      highlightedTopics: [],
      skippableTopics: [],
    },
  }

  // Check for various config files and directories
  const checks: Array<{
    path: string
    callback: (exists: boolean, content?: string) => void
    readContent?: boolean
  }> = [
    // Languages
    {
      path: "package.json",
      readContent: true,
      callback: (exists, content) => {
        if (exists && content) {
          analysis.languages.javascript = true
          try {
            const pkg = JSON.parse(content)

            // Check for TypeScript
            if (
              pkg.devDependencies?.typescript ||
              pkg.dependencies?.typescript
            ) {
              analysis.languages.typescript = true
            }

            // Check for frameworks
            if (pkg.dependencies?.react || pkg.devDependencies?.react) {
              analysis.frameworks.react = true
              analysis.characteristics.hasFrontend = true
            }
            if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
              analysis.frameworks.vue = true
              analysis.characteristics.hasFrontend = true
            }
            if (pkg.dependencies?.["@angular/core"]) {
              analysis.frameworks.angular = true
              analysis.characteristics.hasFrontend = true
            }
            if (pkg.dependencies?.next || pkg.devDependencies?.next) {
              analysis.frameworks.nextjs = true
              analysis.characteristics.hasFrontend = true
              analysis.characteristics.hasBackend = true
            }
            if (pkg.dependencies?.express) {
              analysis.frameworks.express = true
              analysis.characteristics.hasBackend = true
              analysis.characteristics.hasApi = true
            }

            // Check for testing frameworks
            if (pkg.devDependencies?.jest || pkg.dependencies?.jest) {
              analysis.testing.jest = true
            }
            if (pkg.devDependencies?.vitest || pkg.dependencies?.vitest) {
              analysis.testing.vitest = true
            }
            if (pkg.devDependencies?.mocha || pkg.dependencies?.mocha) {
              analysis.testing.mocha = true
            }

            // Check for database ORMs
            if (pkg.dependencies?.prisma || pkg.devDependencies?.prisma) {
              analysis.database.prisma = true
            }
            if (pkg.dependencies?.sequelize) {
              analysis.database.sequelize = true
            }
            if (pkg.dependencies?.typeorm) {
              analysis.database.typeorm = true
            }
            if (pkg.dependencies?.drizzle || pkg.dependencies?.["drizzle-orm"]) {
              analysis.database.drizzle = true
            }

            // Check for monitoring
            if (pkg.dependencies?.["@sentry/node"] || pkg.dependencies?.["@sentry/react"]) {
              analysis.monitoring.sentry = true
            }
            if (pkg.dependencies?.["dd-trace"]) {
              analysis.monitoring.datadog = true
            }

            // Check for monorepo indicators
            if (pkg.workspaces || pkg.devDependencies?.lerna || pkg.devDependencies?.nx) {
              analysis.characteristics.isMonorepo = true
            }

            // Check if it's a library (has main/exports but no bin)
            if ((pkg.main || pkg.exports) && !pkg.bin) {
              analysis.characteristics.isLibrary = true
            }
          } catch {
            // JSON parse failed, still mark as JS project
          }
        }
      },
    },
    { path: "tsconfig.json", callback: (e) => { if (e) analysis.languages.typescript = true } },
    { path: "pyproject.toml", callback: (e) => { if (e) analysis.languages.python = true } },
    { path: "setup.py", callback: (e) => { if (e) analysis.languages.python = true } },
    { path: "requirements.txt", callback: (e) => { if (e) analysis.languages.python = true } },
    { path: "Cargo.toml", callback: (e) => { if (e) analysis.languages.rust = true } },
    { path: "go.mod", callback: (e) => { if (e) analysis.languages.go = true } },
    { path: "Gemfile", callback: (e) => { if (e) analysis.languages.ruby = true } },
    { path: "pom.xml", callback: (e) => { if (e) analysis.languages.java = true } },
    { path: "build.gradle", callback: (e) => { if (e) analysis.languages.java = true } },
    { path: "*.csproj", callback: (e) => { if (e) analysis.languages.csharp = true } },

    // CI/CD
    { path: ".github/workflows", callback: (e) => { if (e) analysis.ci.githubActions = true } },
    { path: ".gitlab-ci.yml", callback: (e) => { if (e) analysis.ci.gitlabCi = true } },
    { path: ".circleci", callback: (e) => { if (e) analysis.ci.circleCi = true } },
    { path: "Jenkinsfile", callback: (e) => { if (e) analysis.ci.jenkins = true } },

    // Testing directories
    { path: "test", callback: (e) => { if (e) analysis.testing.hasTestDirectory = true } },
    { path: "tests", callback: (e) => { if (e) analysis.testing.hasTestDirectory = true } },
    { path: "__tests__", callback: (e) => { if (e) analysis.testing.hasTestDirectory = true } },
    { path: "spec", callback: (e) => { if (e) { analysis.testing.hasTestDirectory = true; analysis.testing.rspec = true } } },

    // Python testing
    { path: "pytest.ini", callback: (e) => { if (e) analysis.testing.pytest = true } },
    { path: "conftest.py", callback: (e) => { if (e) analysis.testing.pytest = true } },

    // AI Tools
    { path: "AGENTS.md", callback: (e) => { if (e) analysis.aiTools.agentsMd = true } },
    { path: "CLAUDE.md", callback: (e) => { if (e) analysis.aiTools.claudeMd = true } },
    { path: ".github/copilot-instructions.md", callback: (e) => { if (e) analysis.aiTools.copilotInstructions = true } },
    { path: ".cursorrules", callback: (e) => { if (e) analysis.aiTools.cursorRules = true } },
    { path: ".cursor/rules", callback: (e) => { if (e) analysis.aiTools.cursorRules = true } },
    { path: ".continue/config.json", callback: (e) => { if (e) analysis.aiTools.continueConfig = true } },
    { path: "opencode.json", callback: (e) => { if (e) analysis.aiTools.openCodeConfig = true } },

    // Database
    { path: "prisma", callback: (e) => { if (e) analysis.database.prisma = true } },
    { path: "migrations", callback: (e) => { if (e) analysis.database.hasMigrations = true } },
    { path: "db/migrate", callback: (e) => { if (e) { analysis.database.hasMigrations = true; analysis.database.activeRecord = true } } },
    { path: "alembic", callback: (e) => { if (e) { analysis.database.hasMigrations = true; analysis.database.sqlalchemy = true } } },

    // Monitoring
    { path: "sentry.properties", callback: (e) => { if (e) analysis.monitoring.sentry = true } },
    { path: ".sentryclirc", callback: (e) => { if (e) analysis.monitoring.sentry = true } },
    { path: "datadog.yaml", callback: (e) => { if (e) analysis.monitoring.datadog = true } },
    { path: "newrelic.js", callback: (e) => { if (e) analysis.monitoring.newRelic = true } },
    { path: "prometheus.yml", callback: (e) => { if (e) analysis.monitoring.prometheus = true } },

    // Characteristics
    { path: "Dockerfile", callback: (e) => { if (e) analysis.characteristics.hasDocker = true } },
    { path: "docker-compose.yml", callback: (e) => { if (e) analysis.characteristics.hasDocker = true } },
    { path: "docker-compose.yaml", callback: (e) => { if (e) analysis.characteristics.hasDocker = true } },
    { path: "docs", callback: (e) => { if (e) analysis.characteristics.hasDocs = true } },
    { path: "documentation", callback: (e) => { if (e) analysis.characteristics.hasDocs = true } },

    // Python frameworks
    {
      path: "pyproject.toml",
      readContent: true,
      callback: (exists, content) => {
        if (exists && content) {
          if (content.includes("fastapi")) {
            analysis.frameworks.fastapi = true
            analysis.characteristics.hasBackend = true
            analysis.characteristics.hasApi = true
          }
          if (content.includes("django")) {
            analysis.frameworks.django = true
            analysis.characteristics.hasBackend = true
          }
          if (content.includes("pytest")) {
            analysis.testing.pytest = true
          }
          if (content.includes("sqlalchemy")) {
            analysis.database.sqlalchemy = true
          }
        }
      },
    },

    // Ruby frameworks
    {
      path: "Gemfile",
      readContent: true,
      callback: (exists, content) => {
        if (exists && content) {
          if (content.includes("rails")) {
            analysis.frameworks.rails = true
            analysis.characteristics.hasBackend = true
          }
          if (content.includes("rspec")) {
            analysis.testing.rspec = true
          }
        }
      },
    },
  ]

  // Run all checks
  for (const check of checks) {
    const fullPath = join(directory, check.path)
    const exists = await fileExists(fullPath)

    if (check.readContent && exists) {
      try {
        const content = await readFile(fullPath, "utf-8")
        check.callback(exists, content)
      } catch {
        check.callback(exists)
      }
    } else {
      check.callback(exists)
    }
  }

  // Check for frontend indicators in directory listing
  try {
    const entries = await readdir(directory)
    if (entries.includes("src") || entries.includes("app") || entries.includes("pages")) {
      // Could be frontend or backend, need more context
    }
    if (entries.includes("public") || entries.includes("static") || entries.includes("assets")) {
      analysis.characteristics.hasFrontend = true
    }
    if (entries.includes("api") || entries.includes("routes") || entries.includes("controllers")) {
      analysis.characteristics.hasBackend = true
      analysis.characteristics.hasApi = true
    }
  } catch {
    // Directory read failed, continue with other checks
  }

  // Generate recommendations based on analysis
  analysis.recommendations = generateRecommendations(analysis)

  return analysis
}

/**
 * Generate recommendations based on project analysis.
 */
function generateRecommendations(analysis: ProjectAnalysis): ProjectAnalysis["recommendations"] {
  const recommendations: ProjectAnalysis["recommendations"] = {
    suggestedCategories: [
      "Code & Quality",      // Always relevant
      "Integration & Delivery", // Always relevant
    ],
    highlightedTopics: [],
    skippableTopics: [],
  }

  // AI Tools category - highlight if AI tools detected
  const hasAiTools = Object.values(analysis.aiTools).some(v => v)
  if (hasAiTools) {
    recommendations.highlightedTopics.push("AI/LLM Collaboration")
  }
  recommendations.suggestedCategories.push("AI/LLM Collaboration")

  // Operations & QA
  const hasMonitoring = Object.entries(analysis.monitoring)
    .filter(([key]) => key !== "other")
    .some(([, value]) => value === true) || analysis.monitoring.other.length > 0
  if (hasMonitoring) {
    recommendations.highlightedTopics.push("Monitoring & Observability")
  }
  if (analysis.characteristics.hasFrontend) {
    recommendations.highlightedTopics.push("Accessibility")
    recommendations.highlightedTopics.push("Performance Standards")
  }
  recommendations.suggestedCategories.push("Operations & QA")

  // Documentation
  if (analysis.characteristics.isLibrary) {
    recommendations.highlightedTopics.push("Documentation Standards")
    recommendations.highlightedTopics.push("API Documentation")
  }
  recommendations.suggestedCategories.push("Documentation & Knowledge")

  // Team Process
  recommendations.suggestedCategories.push("Team Process")

  // Governance (always)
  recommendations.suggestedCategories.push("Governance")

  // Skippable topics based on what's NOT detected
  const hasDatabase = Object.entries(analysis.database)
    .filter(([key]) => key !== "other")
    .some(([, value]) => value === true) || analysis.database.other.length > 0
  if (!hasDatabase) {
    recommendations.skippableTopics.push("Database & Schema Changes")
  }

  if (!analysis.characteristics.hasFrontend) {
    recommendations.skippableTopics.push("Accessibility & Internationalization")
  }

  const hasCi = Object.entries(analysis.ci)
    .filter(([key]) => key !== "other")
    .some(([, value]) => value === true) || analysis.ci.other.length > 0
  if (!hasCi) {
    recommendations.highlightedTopics.push("Continuous Integration (not yet set up)")
  }

  return recommendations
}

/**
 * Format project analysis results as markdown for the LLM.
 */
export function formatProjectAnalysis(analysis: ProjectAnalysis): string {
  const lines: string[] = [
    "## Project Analysis Results",
    "",
    "I've analyzed your project and detected the following:",
    "",
  ]

  // Languages
  const detectedLanguages = Object.entries(analysis.languages)
    .filter(([key, value]) => key !== "other" && value === true)
    .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
  if (analysis.languages.other.length > 0) {
    detectedLanguages.push(...analysis.languages.other)
  }
  if (detectedLanguages.length > 0) {
    lines.push("### Languages")
    lines.push(detectedLanguages.map(l => `- ${l}`).join("\n"))
    lines.push("")
  }

  // Frameworks
  const detectedFrameworks = Object.entries(analysis.frameworks)
    .filter(([key, value]) => key !== "other" && value === true)
    .map(([key]) => {
      const names: Record<string, string> = {
        react: "React",
        vue: "Vue.js",
        angular: "Angular",
        nextjs: "Next.js",
        express: "Express",
        fastapi: "FastAPI",
        django: "Django",
        rails: "Ruby on Rails",
        springBoot: "Spring Boot",
      }
      return names[key] || key
    })
  if (analysis.frameworks.other.length > 0) {
    detectedFrameworks.push(...analysis.frameworks.other)
  }
  if (detectedFrameworks.length > 0) {
    lines.push("### Frameworks")
    lines.push(detectedFrameworks.map(f => `- ${f}`).join("\n"))
    lines.push("")
  }

  // CI/CD
  const detectedCi = Object.entries(analysis.ci)
    .filter(([key, value]) => key !== "other" && value === true)
    .map(([key]) => {
      const names: Record<string, string> = {
        githubActions: "GitHub Actions",
        gitlabCi: "GitLab CI",
        circleCi: "CircleCI",
        jenkins: "Jenkins",
      }
      return names[key] || key
    })
  if (detectedCi.length > 0) {
    lines.push("### CI/CD")
    lines.push(detectedCi.map(c => `- ${c}`).join("\n"))
    lines.push("")
  } else {
    lines.push("### CI/CD")
    lines.push("- No CI/CD detected (consider setting up)")
    lines.push("")
  }

  // Testing
  const detectedTesting = Object.entries(analysis.testing)
    .filter(([key, value]) => key !== "other" && key !== "hasTestDirectory" && value === true)
    .map(([key]) => {
      const names: Record<string, string> = {
        jest: "Jest",
        vitest: "Vitest",
        mocha: "Mocha",
        pytest: "pytest",
        rspec: "RSpec",
        goTest: "Go test",
      }
      return names[key] || key
    })
  if (detectedTesting.length > 0 || analysis.testing.hasTestDirectory) {
    lines.push("### Testing")
    if (detectedTesting.length > 0) {
      lines.push(detectedTesting.map(t => `- ${t}`).join("\n"))
    }
    if (analysis.testing.hasTestDirectory) {
      lines.push("- Test directory detected")
    }
    lines.push("")
  }

  // AI Tools
  const detectedAiTools: string[] = []
  if (analysis.aiTools.agentsMd) detectedAiTools.push("AGENTS.md")
  if (analysis.aiTools.claudeMd) detectedAiTools.push("CLAUDE.md")
  if (analysis.aiTools.copilotInstructions) detectedAiTools.push("GitHub Copilot instructions")
  if (analysis.aiTools.cursorRules) detectedAiTools.push("Cursor rules")
  if (analysis.aiTools.continueConfig) detectedAiTools.push("Continue config")
  if (analysis.aiTools.openCodeConfig) detectedAiTools.push("OpenCode config")

  if (detectedAiTools.length > 0) {
    lines.push("### AI Tools Configuration")
    lines.push(detectedAiTools.map(t => `- ${t}`).join("\n"))
    lines.push("")
  }

  // Database
  const detectedDatabase: string[] = []
  if (analysis.database.prisma) detectedDatabase.push("Prisma")
  if (analysis.database.sequelize) detectedDatabase.push("Sequelize")
  if (analysis.database.typeorm) detectedDatabase.push("TypeORM")
  if (analysis.database.drizzle) detectedDatabase.push("Drizzle")
  if (analysis.database.sqlalchemy) detectedDatabase.push("SQLAlchemy")
  if (analysis.database.activeRecord) detectedDatabase.push("Active Record")
  if (analysis.database.hasMigrations && detectedDatabase.length === 0) {
    detectedDatabase.push("Migrations detected")
  }

  if (detectedDatabase.length > 0) {
    lines.push("### Database")
    lines.push(detectedDatabase.map(d => `- ${d}`).join("\n"))
    lines.push("")
  }

  // Monitoring
  const detectedMonitoring: string[] = []
  if (analysis.monitoring.sentry) detectedMonitoring.push("Sentry")
  if (analysis.monitoring.datadog) detectedMonitoring.push("Datadog")
  if (analysis.monitoring.newRelic) detectedMonitoring.push("New Relic")
  if (analysis.monitoring.prometheus) detectedMonitoring.push("Prometheus")

  if (detectedMonitoring.length > 0) {
    lines.push("### Monitoring")
    lines.push(detectedMonitoring.map(m => `- ${m}`).join("\n"))
    lines.push("")
  }

  // Project Characteristics
  const characteristics: string[] = []
  if (analysis.characteristics.isMonorepo) characteristics.push("Monorepo")
  if (analysis.characteristics.isLibrary) characteristics.push("Library/Package")
  if (analysis.characteristics.hasDocker) characteristics.push("Docker")
  if (analysis.characteristics.hasFrontend) characteristics.push("Frontend")
  if (analysis.characteristics.hasBackend) characteristics.push("Backend")
  if (analysis.characteristics.hasApi) characteristics.push("API")
  if (analysis.characteristics.hasDocs) characteristics.push("Documentation folder")

  if (characteristics.length > 0) {
    lines.push("### Project Characteristics")
    lines.push(characteristics.map(c => `- ${c}`).join("\n"))
    lines.push("")
  }

  // Recommendations
  lines.push("### Recommendations")
  lines.push("")
  lines.push("**Suggested categories to discuss:**")
  lines.push(analysis.recommendations.suggestedCategories.map(c => `- ${c}`).join("\n"))
  lines.push("")

  if (analysis.recommendations.highlightedTopics.length > 0) {
    lines.push("**Topics to highlight (particularly relevant to this project):**")
    lines.push(analysis.recommendations.highlightedTopics.map(t => `- ${t}`).join("\n"))
    lines.push("")
  }

  if (analysis.recommendations.skippableTopics.length > 0) {
    lines.push("**Topics that may be skippable (not detected in project):**")
    lines.push(analysis.recommendations.skippableTopics.map(t => `- ${t}`).join("\n"))
    lines.push("")
  }

  return lines.join("\n")
}

export const PLUGIN_REPO = "jwilger/opencode-plugin-team-agreements"

// Using array join to avoid esbuild/tsc issues with ## at start of lines in template literals
export const COMMAND_TEMPLATE = [
  "You are helping establish or review team agreements for this project. Team agreements define how humans and LLM agents collaborate on the codebase.",
  "",
  "User's request: $ARGUMENTS",
  "",
  "## Overview",
  "",
  "Team agreements are stored in TWO locations:",
  "",
  "1. **`docs/TEAM_AGREEMENTS.md`** - Comprehensive documentation of all team agreements (reference material for humans)",
  "2. **`AGENTS.md`** - Only the rules that LLMs need to always have in context when working on the codebase",
  "",
  "The split ensures:",
  "- Human team members have complete reference documentation",
  "- LLM context isn't bloated with procedures they don't need constantly (deployment procedures, post-mortem processes, meeting cadences, etc.)",
  "- LLMs can still reference the full docs when needed",
  "",
  "This is a comprehensive interview covering 7 categories of software development practices. The full interview typically takes 25-40 minutes, but you can skip topics or pause and resume later.",
  "",
  "## Step 1: Analyze Project & Existing Files",
  "",
  "**First, use the `analyze_project` tool** to detect:",
  "- Languages, frameworks, and tools in use",
  "- CI/CD, testing, and monitoring setup",
  "- AI tools already configured",
  "- Project characteristics (monorepo, library, frontend/backend)",
  "",
  "Then check for existing files:",
  "1. **Read `docs/TEAM_AGREEMENTS.md`** (if it exists) - Full team agreements",
  "2. **Read `AGENTS.md`** (if it exists) - LLM-specific rules",
  "3. **Read `CLAUDE.md`** (if it exists) - Claude Code specific rules",
  "",
  "## Step 2: Determine the Scenario",
  "",
  "Based on what you find, you'll be in one of these scenarios:",
  "",
  "### Scenario A: No existing team agreements",
  "- You'll create `docs/TEAM_AGREEMENTS.md` with full documentation",
  "- You'll create/update `AGENTS.md` with LLM-relevant rules only",
  "",
  "### Scenario B: docs/TEAM_AGREEMENTS.md exists",
  "- Present the user with options:",
  "  - **Review**: Display current content",
  "  - **Amend**: Modify or add to specific sections",
  "  - **Regenerate AGENTS.md**: Re-extract LLM-relevant rules",
  "",
  "### Scenario C: Only AGENTS.md/CLAUDE.md exist (legacy setup)",
  "- Explain the new split approach",
  "- Offer to migrate: create `docs/TEAM_AGREEMENTS.md` as comprehensive docs",
  "- Update AGENTS.md to contain only LLM-relevant rules",
  "- If CLAUDE.md exists, ensure it imports AGENTS.md and keep Claude-specific rules",
  "",
  "## Step 3: Present Categories Based on Analysis",
  "",
  "Show the project analysis results and present the 7 categories:",
  "",
  "```",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "TEAM AGREEMENTS INTERVIEW",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "",
  "Based on your project analysis, here are the categories we'll cover:",
  "",
  "1. Code & Quality (4 topics) - How code is written",
  "2. Integration & Delivery (4 topics) - How code flows",
  "3. Operations & QA (4 topics) - How code runs",
  "4. Documentation & Knowledge (3 topics) - How knowledge is captured",
  "5. AI/LLM Collaboration (6 topics) - How humans and AI work together",
  "6. Team Process (3 topics) - How the team works",
  "7. Governance (2 topics) - How agreements evolve",
  "",
  "Estimated time: 25-40 minutes (you can pause anytime)",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "```",
  "",
  "Based on the project analysis, highlight which categories/topics are particularly relevant or potentially skippable. Ask if they want to proceed with all categories or skip any.",
  "",
  "## Step 4: Gather Team Agreements",
  "",
  "Guide through each category ONE question at a time. Show progress at the start of each category:",
  "",
  "```",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "Category X of 7: [Category Name]",
  "Topics: [list topics in this category]",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "```",
  "",
  "### Interview Style Guidelines",
  "",
  "- Ask **ONE question at a time** - don't overwhelm",
  "- **Discuss trade-offs** when relevant (e.g., strictness vs flexibility)",
  "- **Use WebFetch** to research best practices when helpful",
  "- Confirm understanding before moving on",
  "- Capture the **why** behind decisions, not just the what",
  "- Allow skipping topics with \"skip\" or \"not applicable\"",
  "- Allow pausing with \"let's continue later\" (summarize progress)",
  "",
  "---",
  "",
  "## CATEGORY 1: CODE & QUALITY",
  "",
  "### 1.1 Programming Languages & Tech Stack",
  "",
  "Questions to explore:",
  "- What programming language(s) will be used in this project?",
  "- What is each language used for? (e.g., TypeScript for frontend, Rust for backend)",
  "- Are there specific version requirements?",
  "- Are there language-specific style guides to follow? (e.g., PEP 8, StandardJS, Google Style)",
  "- What build tools and package managers are used?",
  "- (If monorepo) How are packages/modules organized?",
  "",
  "### 1.2 Code Quality Standards",
  "",
  "Questions to explore:",
  '- What does "great code" look like for this team?',
  "- How should we prioritize: readability vs. performance vs. simplicity?",
  "- Are there required design patterns? (SOLID, Clean Architecture, DDD, etc.)",
  "- Are there anti-patterns to explicitly avoid?",
  "- Error handling conventions? (throw vs return, error types, logging)",
  "- Naming conventions for files, functions, variables, types, constants?",
  "- Complexity limits? (max function length, cyclomatic complexity)",
  "- Code comments philosophy? (when to comment, what to avoid)",
  "",
  "### 1.3 Code Review Process",
  "",
  "Questions to explore:",
  "- What should code reviewers focus on? (correctness, style, security, performance)",
  "- What's the expected turnaround time for reviews?",
  "- Minimum number of approvers required?",
  "- How should disagreements in review be handled?",
  "- Are there PR size guidelines? (max lines, max files)",
  "- Should authors self-review before requesting review?",
  "- Review comment etiquette? (suggestions vs demands, tone)",
  "- Are there things reviewers should NOT focus on? (let linters handle)",
  "",
  "### 1.4 Testing Requirements",
  "",
  "Questions to explore:",
  '- What testing is required before code is considered "done"?',
  "- Are there coverage thresholds? (line, branch, function)",
  "- What types of tests are required? (unit, integration, e2e, smoke, contract)",
  "- When should tests be written? (TDD, before PR, alongside implementation)",
  "- Test naming conventions?",
  "- Test data management? (factories, fixtures, mocking strategies)",
  "- What makes a good test? (isolation, determinism, clarity)",
  "- Security testing requirements?",
  "- Performance testing requirements?",
  "- Accessibility testing requirements? (if frontend)",
  "",
  "---",
  "",
  "## CATEGORY 2: INTEGRATION & DELIVERY",
  "",
  "### 2.1 Version Control & Branching",
  "",
  "Questions to explore:",
  "- What branching strategy? (trunk-based, GitHub Flow, GitFlow)",
  "- Branch naming conventions?",
  "- Commit message format? (Conventional Commits, custom, freeform)",
  "- Required commit message elements? (ticket numbers, scope, type)",
  "- Rules on length, tense, capitalization for commits?",
  "- Should commits be atomic? (one logical change per commit)",
  "- Squash, merge, or rebase for PRs?",
  "- Protected branches configuration?",
  "",
  "### 2.2 Continuous Integration",
  "",
  "Questions to explore:",
  "- What CI checks are required before merge?",
  "- Build requirements?",
  "- Lint and format checks?",
  "- Test requirements in CI?",
  "- Who (if anyone) can bypass CI?",
  "- How should flaky tests be handled?",
  "- CI timeout limits?",
  "",
  "### 2.3 Deployment & Release",
  "",
  "Questions to explore:",
  "- Deployment strategy? (blue-green, canary, rolling, direct)",
  "- Environment management? (dev, staging, prod)",
  "- Feature flags usage?",
  "- Rollback procedures?",
  "- Release cadence? (continuous, weekly, on-demand)",
  "- Versioning scheme? (semver, calver, other)",
  "- Release notes requirements?",
  "- Hotfix procedures?",
  "- Who can deploy? Who approves production deploys?",
  "- Deploy freeze periods?",
  "",
  "### 2.4 Database & Schema Changes",
  "",
  "(Skip if no database detected)",
  "",
  "Questions to explore:",
  "- Migration strategy?",
  "- Schema change review process?",
  "- Data migration testing requirements?",
  "- Rollback procedures for migrations?",
  "- Database naming conventions?",
  "- Query performance standards?",
  "",
  "---",
  "",
  "## CATEGORY 3: OPERATIONS & QA",
  "",
  "### 3.1 Security Practices",
  "",
  "Questions to explore:",
  "- Security review requirements for sensitive code?",
  "- Secret management approach?",
  "- Dependency vulnerability scanning?",
  "- Authentication/authorization patterns to follow?",
  "- Input validation requirements?",
  "- Security incident response process?",
  "- OWASP guidelines awareness?",
  "",
  "When discussing security, consider using WebFetch to look up current OWASP top 10 or relevant security guidelines.",
  "",
  "### 3.2 Monitoring & Observability",
  "",
  "Questions to explore:",
  "- Logging standards? (what to log, format, levels)",
  "- Metrics and alerting requirements?",
  "- On-call procedures?",
  "- Incident severity levels?",
  "- Post-mortem/retrospective process?",
  "- Runbook requirements?",
  "- Error tracking approach?",
  "",
  "### 3.3 Performance Standards",
  "",
  "(Highlight for frontend-heavy projects)",
  "",
  "Questions to explore:",
  "- Performance budgets? (load time, bundle size, memory)",
  "- Load testing requirements?",
  "- Profiling practices?",
  "- Caching strategies?",
  "- Performance regression testing?",
  "",
  "### 3.4 Accessibility & Internationalization",
  "",
  "(Primarily for user-facing applications)",
  "",
  "Questions to explore:",
  "- WCAG compliance level? (A, AA, AAA)",
  "- Accessibility testing requirements?",
  "- Screen reader testing?",
  "- Keyboard navigation requirements?",
  "- Language/locale support?",
  "- RTL support considerations?",
  "- Translation workflow?",
  "",
  "---",
  "",
  "## CATEGORY 4: DOCUMENTATION & KNOWLEDGE",
  "",
  "### 4.1 Documentation Standards",
  "",
  "Questions to explore:",
  "- README standards? (what must be included)",
  "- API documentation requirements?",
  "- Architecture documentation?",
  "- In-code documentation? (JSDoc, docstrings, when to use)",
  "- Changelog maintenance?",
  "- Runbook/playbook requirements?",
  "- Where does documentation live?",
  "- Documentation review process?",
  "",
  "### 4.2 Architecture Decision Records (ADRs)",
  "",
  "Questions to explore:",
  "- When should an ADR be written?",
  "- ADR format/template?",
  "- Review process for ADRs?",
  "- Where are ADRs stored?",
  "- How are superseded ADRs handled?",
  "",
  "### 4.3 Dependency Management",
  "",
  "Questions to explore:",
  "- Dependency approval process?",
  "- Version pinning strategy? (exact, range, floating)",
  "- Upgrade cadence?",
  "- License compliance requirements?",
  "- Security vulnerability response time?",
  "- Internal vs external package policies?",
  "- Dependency audit process?",
  "",
  "---",
  "",
  "## CATEGORY 5: AI/LLM COLLABORATION",
  "",
  "This category is particularly important for teams using AI coding assistants like OpenCode, Claude Code, GitHub Copilot, Cursor, etc.",
  "",
  "### 5.1 AI Tools & Policies",
  "",
  "Questions to explore:",
  "- What AI coding tools does the team use or approve?",
  "- Is there an official stance on AI usage? (encouraged, allowed with guidelines, restricted)",
  "- Are there tasks where AI should NOT be used? (security-sensitive, licensed code, etc.)",
  "- How should AI tool usage be communicated or tracked?",
  "- Data privacy considerations with AI tools?",
  "",
  "### 5.2 Autonomy Boundaries",
  "",
  "Questions to explore:",
  "- What can AI agents do autonomously without asking?",
  "  - Create/modify files?",
  "  - Run tests?",
  "  - Make commits?",
  "  - Create pull requests?",
  "  - Merge code?",
  "  - Deploy?",
  "  - Install dependencies?",
  "- What always requires human confirmation?",
  "- Are there files/directories AI should never touch?",
  "- Can AI access external resources? (web, APIs, MCP servers)",
  "- Git operations permissions? (push, force push, branch deletion)",
  "",
  "### 5.3 AI Code Generation Standards",
  "",
  "Questions to explore:",
  "- What quality standards apply to AI-generated code? (same as human, stricter, different)",
  "- Should AI-generated code be clearly marked or attributed?",
  "- Are there specific review requirements for AI-generated code?",
  "- How should AI-generated tests be validated?",
  "- Policy on accepting AI suggestions without modification?",
  "- AI code that requires extra scrutiny? (security, data handling)",
  "",
  "### 5.4 Context & Session Management",
  "",
  "Questions to explore:",
  "- How should context be structured in AGENTS.md?",
  "- What information should AI always have access to?",
  "- Session handoff summary requirements? (what to include when ending a session)",
  "- How should AI communicate progress during long tasks?",
  "- Information to preserve between sessions?",
  "- How to handle context limits and compaction?",
  "- Project-specific knowledge AI should know?",
  "",
  "### 5.5 Human Oversight & Escalation",
  "",
  "Questions to explore:",
  "- What triggers should cause AI to stop and ask for human input?",
  "- Self-verification requirements? (run tests, check lints before committing)",
  "- How should AI handle suspected errors in its own output?",
  "- Handling uncertainty or ambiguous requirements?",
  "- Escalation path when AI gets stuck?",
  "- Maximum scope of changes AI can make without checking in?",
  "- How should AI flag concerns or potential issues?",
  "",
  "### 5.6 Learning & Improvement",
  "",
  "Questions to explore:",
  "- How should effective AI prompts/patterns be shared with the team?",
  "- Is there a team prompt library or best practices doc?",
  "- How should AI mistakes be documented for learning?",
  "- Retrospectives on AI effectiveness?",
  "- How to update AGENTS.md as AI capabilities evolve?",
  "- Feedback loop for improving AI collaboration?",
  "",
  "---",
  "",
  "## CATEGORY 6: TEAM PROCESS",
  "",
  "### 6.1 Development Methodology",
  "",
  "Questions to explore:",
  "- What agile/methodology practices are used? (Scrum, Kanban, XP, none)",
  "- Sprint/iteration cadence?",
  "- Definition of Done?",
  "- Definition of Ready?",
  "- Estimation approach? (story points, t-shirt sizes, no estimates)",
  "- Meeting cadence? (standups, planning, retros)",
  "- WIP (work-in-progress) limits?",
  "",
  "### 6.2 Planning & Work Breakdown",
  "",
  "Questions to explore:",
  "- How is work broken down? (epics → stories → tasks)",
  "- Story/task sizing guidelines?",
  "- Spike guidelines? (when, how long, expected output)",
  "- Technical debt handling? (tracking, prioritization)",
  "- Prioritization framework?",
  "- How are blockers escalated?",
  "",
  "### 6.3 Communication & Collaboration",
  "",
  "Questions to explore:",
  "- Async vs sync communication preferences?",
  "- Response time expectations?",
  "- Decision documentation requirements?",
  "- Knowledge sharing practices?",
  "- Onboarding process for new team members?",
  "- Pair programming / mob programming practices?",
  "",
  "---",
  "",
  "## CATEGORY 7: GOVERNANCE",
  "",
  "### 7.1 Amendment Process",
  "",
  "Questions to explore:",
  "- How can these agreements be changed?",
  "- Who has authority to propose changes?",
  "- What's the review/approval process for amendments?",
  "- How should changes be communicated to the team?",
  "- How often should agreements be reviewed?",
  "",
  "### 7.2 Open-Ended",
  "",
  'After completing all categories, ask:',
  "",
  '"Is there anything else you\'d like to include in your team agreements that we haven\'t covered?"',
  "",
  "Allow free-form additions. If the user suggests a topic that seems generally useful, offer to file a GitHub issue to suggest it for the plugin:",
  "",
  '"Would you like me to suggest this topic to be included in future versions of the team-agreements plugin? I can file a GitHub issue for you."',
  "",
  "If yes, use the `suggest_team_agreement_topic` tool.",
  "",
  "---",
  "",
  "## Step 5: Generate Documents",
  "",
  "After gathering all agreements, generate both documents:",
  "",
  "### 5a. Create/Update docs/TEAM_AGREEMENTS.md",
  "",
  "- Create the `docs/` directory if it doesn't exist",
  "- Write the comprehensive documentation with ALL agreements",
  "- Preserve existing content if updating (intelligent merging)",
  "- Match existing document tone and style",
  "",
  "### 5b. Extract LLM-Relevant Rules to AGENTS.md",
  "",
  "- Extract only rules that affect day-to-day coding",
  "- Keep it concise - LLMs don't need verbose explanations",
  "- If AGENTS.md has other content (project description, architecture), preserve it",
  "- Add a reference to docs/TEAM_AGREEMENTS.md for complete details",
  "",
  "### Merging Guidelines",
  "",
  "When updating existing files:",
  "- **Preserve existing structure** - Don't reorganize content the user already has",
  "- **Avoid duplication** - If similar content exists, enhance rather than duplicate",
  "- **Maintain voice** - Match the existing document's tone and style",
  "",
  "## Step 6: Handle CLAUDE.md Coordination",
  "",
  "If CLAUDE.md exists or Claude-specific rules are needed:",
  "",
  "1. Ensure it has `@AGENTS.md` at the top to import the shared rules",
  "2. Keep only Claude-specific content in CLAUDE.md, such as:",
  "   - Claude-specific behavior instructions",
  "   - Claude-specific tool usage preferences",
   "   - Anything that shouldn't apply to other agents",
  "",
  "## Step 7: Offer Enforcement Setup",
  "",
  "After generating/updating the agreements, use the `detect_enforcement_mechanisms` tool to check what enforcement is already in place, then offer to set up automatic enforcement for agreements that can be enforced programmatically.",
  "",
  "### Enforcement Mechanisms",
  "",
  "| Agreement Type | Enforcement Options |",
  "|----------------|---------------------|",
  "| Commit messages | commitlint, husky/lefthook hooks |",
  "| Code formatting | Prettier, Biome, pre-commit hooks |",
  "| Linting | ESLint, Biome, language-specific linters |",
  "| Testing | CI workflows, pre-push hooks |",
  "| Coverage | CI workflows with coverage gates |",
  "| Security | Dependabot, Snyk, CodeQL, CI workflows |",
  "| PR requirements | GitHub branch protection, rulesets |",
  "| Documentation | CI checks for README, API docs |",
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
  "You will create/update TWO files:",
  "",
  "### 1. docs/TEAM_AGREEMENTS.md (Comprehensive Documentation)",
  "",
  "This is the full reference document for the team. Include ALL agreements from ALL categories.",
  "",
  "```markdown",
  "# Team Agreements",
  "",
  "This document defines how our team collaborates on this codebase.",
  "*Last updated: [date]*",
  "",
  "> **For LLM Agents:** The rules you need to follow are in `AGENTS.md`.",
  "> This document is comprehensive reference material. Consult it when you need",
  "> detailed information about deployment, processes, or other team practices.",
  "",
  "## Code & Quality",
  "",
  "### Languages & Tech Stack",
  "[Full details...]",
  "",
  "### Code Quality Standards",
  "[Full details...]",
  "",
  "### Code Review Process",
  "[Full details including turnaround times, disagreement resolution, etc.]",
  "",
  "### Testing Requirements",
  "[Full details...]",
  "",
  "## Integration & Delivery",
  "",
  "### Version Control & Branching",
  "[Full details...]",
  "",
  "### Continuous Integration",
  "[Full details...]",
  "",
  "### Deployment & Release",
  "[Full details including environments, rollback procedures, hotfixes, etc.]",
  "",
  "### Database & Schema Changes",
  "[Full details if applicable...]",
  "",
  "## Operations & QA",
  "",
  "### Security Practices",
  "[Full details...]",
  "",
  "### Monitoring & Observability",
  "[Full details including on-call, incident response, post-mortems, etc.]",
  "",
  "### Performance Standards",
  "[Full details if applicable...]",
  "",
  "### Accessibility & Internationalization",
  "[Full details if applicable...]",
  "",
  "## Documentation & Knowledge",
  "",
  "### Documentation Standards",
  "[Full details...]",
  "",
  "### Architecture Decision Records",
  "[Full details...]",
  "",
  "### Dependency Management",
  "[Full details...]",
  "",
  "## AI/LLM Collaboration",
  "",
  "### AI Tools & Policies",
  "[Full details...]",
  "",
  "### Autonomy Boundaries",
  "[Full details - what AI can/cannot do autonomously...]",
  "",
  "### AI Code Generation Standards",
  "[Full details...]",
  "",
  "### Context & Session Management",
  "[Full details...]",
  "",
  "### Human Oversight & Escalation",
  "[Full details...]",
  "",
  "### Learning & Improvement",
  "[Full details...]",
  "",
  "## Team Process",
  "",
  "### Development Methodology",
  "[Full details...]",
  "",
  "### Planning & Work Breakdown",
  "[Full details...]",
  "",
  "### Communication & Collaboration",
  "[Full details...]",
  "",
  "## Governance",
  "",
  "### Amendment Process",
  "[Full details...]",
  "```",
  "",
  "### 2. AGENTS.md (LLM Context Rules)",
  "",
  "This file contains ONLY the rules that LLMs need constantly in context. Extract rules that affect day-to-day coding work.",
  "",
  "**What to include in AGENTS.md:**",
  "- Code quality standards and patterns",
  "- Testing requirements",
  "- Commit message format",
  "- Code review expectations",
  "- Branching/PR conventions",
  "- AI autonomy boundaries",
  "- AI code generation standards",
  "- Escalation triggers",
  "",
  "**What NOT to include in AGENTS.md (keep only in docs/TEAM_AGREEMENTS.md):**",
  "- Deployment procedures (reference when needed)",
  "- On-call and incident procedures",
  "- Post-mortem processes",
  "- Meeting cadences and ceremonies",
  "- Detailed release procedures",
  "- Onboarding processes",
  "- Communication preferences",
  "",
  "```markdown",
  "# Agent Instructions",
  "",
  "This file contains rules for LLM agents working on this codebase.",
  "For complete team agreements, see `docs/TEAM_AGREEMENTS.md`.",
  "",
  "## Code Standards",
  "",
  "[Concise code quality rules...]",
  "[Naming conventions...]",
  "[Error handling patterns...]",
  "",
  "## Testing",
  "",
  "[What tests are required...]",
  "[Coverage requirements...]",
  "",
  "## Version Control",
  "",
  "[Commit message format...]",
  "[Branch naming...]",
  "[PR requirements...]",
  "",
  "## Code Review",
  "",
  "[What reviewers look for...]",
  "[Self-review checklist...]",
  "",
  "## AI Autonomy",
  "",
  "[What you can do without asking...]",
  "[What requires human approval...]",
  "[Files/areas to avoid...]",
  "",
  "## AI Code Standards",
  "",
  "[Quality requirements for AI-generated code...]",
  "[When to run tests...]",
  "[Verification requirements...]",
  "",
  "## Escalation",
  "",
  "[When to stop and ask...]",
  "[How to flag concerns...]",
  "```",
  "",
  "### 3. CLAUDE.md Coordination (if applicable)",
  "",
  "If CLAUDE.md exists or Claude-specific rules are needed:",
  "- Ensure it imports AGENTS.md: `@AGENTS.md` at the top",
  "- Keep only Claude-specific behavior/preferences in CLAUDE.md",
  "```",
  "",
  "## Important Guidelines",
  "",
  "- Be conversational and collaborative",
  "- **ONE question at a time** - don't overwhelm",
  "- Respect the user's expertise and preferences",
  "- If the user provides a specific request in their message, address that first",
  "- Allow skipping entire categories or individual topics",
  "- Support pausing and resuming the interview",
  "- Show progress indicators at category transitions",
  "- Use WebFetch to research best practices when relevant",
  '- Capture the "why" behind decisions, not just the "what"',
  "- When merging, preserve the user's existing content and style",
  "- Always explain what you're about to do before making file changes",
  "- The AI/LLM Collaboration category is particularly important - don't rush through it",
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
