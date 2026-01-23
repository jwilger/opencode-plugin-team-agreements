// Mock for @opencode-ai/plugin to avoid ESM resolution issues in tests
// The real package has a bug where index.js exports from "./tool" without .js extension

import { z } from "zod"

export type ToolContext = {
  sessionID: string
  messageID: string
  agent: string
  abort: AbortSignal
  metadata(input: { title?: string; metadata?: { [key: string]: any } }): void
  ask(input: {
    permission: string
    patterns: string[]
    always: string[]
    metadata: { [key: string]: any }
  }): Promise<void>
}

export function tool<Args extends z.ZodRawShape>(input: {
  description: string
  args: Args
  execute(args: z.infer<z.ZodObject<Args>>, context: ToolContext): Promise<string>
}) {
  return input
}

tool.schema = z

export type ToolDefinition = ReturnType<typeof tool>

export type PluginInput = {
  client: any
  project: any
  directory: string
  worktree: string
  serverUrl: URL
  $: any
}

export type Plugin = (input: PluginInput) => Promise<Hooks>

export interface Hooks {
  event?: (input: { event: any }) => Promise<void>
  config?: (input: any) => Promise<void>
  tool?: { [key: string]: ToolDefinition }
  auth?: any
  "chat.message"?: (input: any, output: any) => Promise<void>
  "chat.params"?: (input: any, output: any) => Promise<void>
  "chat.headers"?: (input: any, output: any) => Promise<void>
  "permission.ask"?: (input: any, output: any) => Promise<void>
  "command.execute.before"?: (input: any, output: any) => Promise<void>
  "tool.execute.before"?: (input: any, output: any) => Promise<void>
  "tool.execute.after"?: (input: any, output: any) => Promise<void>
  "experimental.chat.messages.transform"?: (input: any, output: any) => Promise<void>
  "experimental.chat.system.transform"?: (input: any, output: any) => Promise<void>
  "experimental.session.compacting"?: (
    input: { sessionID: string },
    output: { context: string[]; prompt?: string }
  ) => Promise<void>
  "experimental.text.complete"?: (input: any, output: any) => Promise<void>
}
