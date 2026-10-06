import type { Translator } from './i18n/translate'
import type { AttemptAnswerResponse, Question } from './api/types'

export type ResultState = 'correct' | 'partial' | 'incorrect' | 'unanswered'

export function questionResults(questions: Question[], answers: AttemptAnswerResponse[], t: Translator) {
  const byId = new Map(answers.map(answer => [answer.questionId, answer]))
  return questions.map((question, index) => {
    const answer = byId.get(question.id)
    let value: unknown = null
    try { value = answer ? JSON.parse(answer.responseJson) : null } catch { /* Treat invalid stored responses as unavailable. */ }
    const points = answer?.pointsAwarded ?? 0
    const provided = typeof value === 'string' ? value.trim().length > 0
      : Array.isArray(value) && value.some(item => typeof item === 'string' ? item.length > 0 : isPair(item) && item.rightId.length > 0)
    const state: ResultState = points >= question.points ? 'correct' : points > 0 ? 'partial' : provided ? 'incorrect' : 'unanswered'
    return { question, number: index + 1, points, state, answerLines: answerLines(question, value, t) }
  })
}

function isPair(value: unknown): value is { leftId: string; rightId: string } {
  return typeof value === 'object' && value !== null && 'leftId' in value && 'rightId' in value
    && typeof value.leftId === 'string' && typeof value.rightId === 'string'
}

function answerLines(question: Question, value: unknown, t: Translator): string[] {
  if (question.type === 'matching') {
    const pairs = Array.isArray(value) ? value.filter(isPair) : []
    return question.left.map(left => {
      const rightId = pairs.find(pair => pair.leftId === left.id)?.rightId
      const right = question.right.find(item => item.id === rightId)
      return `${left.text} → ${right?.text ?? (rightId ? t("Lựa chọn không hợp lệ") : t("Chưa ghép"))}`
    })
  }
  if (question.type === 'short_answer') return typeof value === 'string' && value.trim() ? [value] : []
  const ids = Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : []
  return ids.map(id => question.options.find(option => option.id === id)?.text ?? t("Lựa chọn không hợp lệ"))
}
