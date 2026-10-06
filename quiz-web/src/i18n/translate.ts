import english from './en.json'

export type Language = 'vi' | 'en'
export type Translator = (text: string, values?: readonly (string | number)[]) => string
export const languageStorageKey = 'quizz-app-language'
export const locales: Record<Language, string> = { vi: 'vi-VN', en: 'en-US' }
const translations: Record<string, string> = english

export function translate(language: Language, text: string, values: readonly (string | number)[] = []): string {
  const key = text.trim()
  if (!key) return text
  const translated = language === 'en' && Object.hasOwn(translations, key) ? translations[key] : key
  const result = translated.replace(/\{(\d+)\}/g, (placeholder, index: string) => String(values[Number(index)] ?? placeholder))
  return text.slice(0, text.length - text.trimStart().length) + result + text.slice(text.trimEnd().length)
}

export function readLanguage(): Language {
  try { return window.localStorage.getItem(languageStorageKey) === 'en' ? 'en' : 'vi' }
  catch { return 'vi' }
}
