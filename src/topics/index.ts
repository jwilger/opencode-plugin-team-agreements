/**
 * Topic registry for team agreements.
 *
 * Each topic represents a category of team agreements that can be
 * established through interactive conversation.
 */

export interface TopicQuestion {
  id: string
  question: string
  description?: string
  followUp?: (answer: unknown) => TopicQuestion[] | null
}

export interface Topic {
  id: string
  name: string
  description: string
  questions: TopicQuestion[]
  generate: (answers: Record<string, unknown>) => string
}

// MVP Topics - to be implemented
export const MVP_TOPICS = [
  "storage",
  "languages",
  "code-quality",
  "commits",
  "integration",
  "testing",
  "amendments",
] as const

export type TopicId = (typeof MVP_TOPICS)[number]

// Topic registry - will be populated as topics are implemented
const topicRegistry = new Map<TopicId, Topic>()

export function registerTopic(topic: Topic): void {
  topicRegistry.set(topic.id as TopicId, topic)
}

export function getTopic(id: TopicId): Topic | undefined {
  return topicRegistry.get(id)
}

export function getAllTopics(): Topic[] {
  return MVP_TOPICS.map((id) => topicRegistry.get(id)).filter(
    (t): t is Topic => t !== undefined
  )
}
