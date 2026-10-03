import type {
  Answers,
  AuthConfig,
  CurrentUser,
  AttemptResponse,
  AttemptResultResponse,
  Category,
  CreateQuizResponse,
  QuizDefinition,
  ValidationError,
  AdminPage,
  AdminOverview,
  AdminQuiz,
  QuizStatus,
  AdminAttemptFilters,
  AdminAttempt,
  AdminAttemptDetail,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const method = (init.method ?? 'GET').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = await request<{ headerName: string | null; token: string | null }>('/auth/csrf')
    if (csrf.headerName && csrf.token) headers.set(csrf.headerName, csrf.token)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    redirect: 'error',
  })

  const text = await response.text()
  let body: unknown = null
  if (text) {
    try { body = JSON.parse(text) } catch { body = text }
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body && body.message
      ? String(body.message)
      : typeof body === 'object' && body !== null && 'error' in body
      ? String(body.error)
      : `Request failed (${response.status})`
    throw new ApiError(response.status, message)
  }
  return body as T
}

export const api = {
  adminOverview: () => request<AdminOverview>('/admin/overview'),
  adminUsers: (page: number, q: string) => request<AdminPage<CurrentUser>>(`/admin/users?${new URLSearchParams({ page: String(page), q })}`),
  changeUserRole: (id: number, roleCode: CurrentUser['roleCode']) => request<CurrentUser>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ roleCode }) }),
  adminQuizzes: (page: number, q: string, status?: QuizStatus, categoryId?: number) => request<AdminPage<AdminQuiz>>(`/admin/quizzes?${new URLSearchParams({ page: String(page), q, ...(status ? { status } : {}), ...(categoryId ? { categoryId: String(categoryId) } : {}) })}`),
  adminAttempts: (page: number, size: number, filters: AdminAttemptFilters) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)) })
    return request<AdminPage<AdminAttempt>>(`/admin/attempts?${params}`)
  },
  adminAttemptDetail: (id: number) => request<AdminAttemptDetail>(`/admin/attempts/${id}`),
  adminQuizDefinition: (id: number) => request<unknown>(`/admin/quizzes/${id}/definition`),
  createCategory: (code: string, name: string) => request<Category>('/categories', { method: 'POST', body: JSON.stringify({ code, name }) }),
  authConfig: () => request<AuthConfig>('/auth/config'),
  currentUser: async (): Promise<CurrentUser | null> => {
    try { return await request<CurrentUser>('/me') }
    catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error }
  },
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  categories: () => request<Category[]>('/categories'),
  validateDefinition: (rawJson: string) => request<ValidationError[]>('/quiz-definitions/validate', {
    method: 'POST', body: rawJson,
  }),
  createQuiz: (rawJson: string) => request<CreateQuizResponse>('/admin/quizzes', {
    method: 'POST', body: rawJson,
  }),
  publishQuiz: (quizId: number) => request<CreateQuizResponse>(`/admin/quizzes/${quizId}/publish`, {
    method: 'POST',
  }),
  quiz: (quizId: number) => request<QuizDefinition>(`/quizzes/${quizId}`),
  startAttempt: (quizId: number) => request<AttemptResponse>(`/quizzes/${quizId}/attempts`, {
    method: 'POST',
  }),
  submitAttempt: (attemptId: number, answers: Answers) => request<AttemptResponse>(`/attempts/${attemptId}/submit`, {
    method: 'POST', body: JSON.stringify(answers),
  }),
  attemptResult: (attemptId: number) => request<AttemptResultResponse>(`/attempts/${attemptId}`),
  attemptDefinition: (attemptId: number) => request<QuizDefinition>(`/attempts/${attemptId}/definition`),
  grantRetake: (attemptId: number) => request<number>(`/admin/attempts/${attemptId}/retake-grants`, {
    method: 'POST',
  }),
  startRetake: (grantId: number) => request<AttemptResponse>(`/retake-grants/${grantId}/attempts`, {
    method: 'POST',
  }),
}
