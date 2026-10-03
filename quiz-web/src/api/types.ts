export type QuizStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED'

export interface CurrentUser {
  id: number
  email: string
  displayName: string | null
  roleCode: 'USER' | 'ADMIN'
}

export interface AuthConfig {
  googleEnabled: boolean
  loginUrl: string
}

export interface Category {
  id: number
  code: string
  name: string
}

export interface ValidationError {
  path: string
  message: string
}

export interface Option {
  id: string
  text: string
}

export interface MatchingItem {
  id: string
  text: string
}

export interface MatchingPair {
  leftId: string
  rightId: string
}

export interface BaseQuestion {
  id: string
  type: QuestionType
  prompt: string
  points: number
}

export interface ChoiceQuestion extends BaseQuestion {
  type: 'single_choice' | 'dropdown' | 'multiple_choice'
  options: Option[]
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'short_answer'
}

export interface MatchingQuestion extends BaseQuestion {
  type: 'matching'
  left: MatchingItem[]
  right: MatchingItem[]
}

export type Question = ChoiceQuestion | ShortAnswerQuestion | MatchingQuestion
export type QuestionType = 'single_choice' | 'dropdown' | 'multiple_choice' | 'short_answer' | 'matching'

export interface QuizDefinition {
  schemaVersion: number
  categoryCode: string
  title: string
  description?: string
  durationMinutes: number
  questions: Question[]
}

export interface CreateQuizResponse {
  quizId: number
  versionId: number
  status: QuizStatus
}

export interface AttemptResponse {
  attemptId: number
  quizId: number
  expiresAt: string
  status: AttemptStatus
  totalScore: number | null
  maxScore: number
}

export interface AttemptAnswerResponse {
  questionId: string
  responseJson: string
  pointsAwarded: number
}

export interface AttemptResultResponse extends AttemptResponse {
  quizVersionId: number
  startedAt: string
  submittedAt: string | null
  answers: AttemptAnswerResponse[]
}

export type AnswerValue = string | string[] | MatchingPair[]
export type Answers = Record<string, AnswerValue>

export interface AdminPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
}

export interface AdminOverview {
  users: number
  admins: number
  categories: number
  quizzes: number
  drafts: number
  activeQuizzes: number
  submittedAttempts: number
}

export interface AdminQuiz {
  id: number
  title: string
  categoryName: string
  categoryCode: string
  status: QuizStatus
  createdBy: string
}

export interface AdminAttemptFilters {
  categoryId?: number
  quizId?: number
  user?: string
  from?: string
  to?: string
  minPercent?: number
  maxPercent?: number
  method?: 'USER' | 'AUTO'
  retake?: boolean
  order?: 'NEWEST' | 'OLDEST' | 'SCORE_HIGH' | 'SCORE_LOW'
}

export interface AdminAttempt {
  attemptId: number
  userId: number
  email: string
  displayName: string | null
  quizId: number
  quizTitle: string
  categoryId: number
  categoryName: string
  quizVersionId: number
  startedAt: string
  submittedAt: string
  totalScore: number | null
  maxScore: number
  percent: number | null
  submissionMethod: 'USER' | 'AUTO' | null
  retake: boolean
}

export type AdminQuestion = Question & {
  correctOptionId?: string
  correctOptionIds?: string[]
  acceptedAnswers?: string[]
  correctPairs?: MatchingPair[]
}

export interface AdminAttemptDetail {
  summary: AdminAttempt
  definition: Omit<QuizDefinition, 'questions'> & { questions: AdminQuestion[] }
  answers: AttemptAnswerResponse[]
}
