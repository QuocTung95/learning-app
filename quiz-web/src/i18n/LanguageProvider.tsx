import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Dropdown, Tooltip } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { languageStorageKey, locales, readLanguage, translate } from './translate'
import type { Language, Translator } from './translate'

type LanguageContextValue = { language: Language; locale: string; setLanguage: (language: Language) => void; t: Translator }
const LanguageContext = createContext<LanguageContextValue>({ language: 'vi', locale: locales.vi, setLanguage: () => {}, t: (text, values) => translate('vi', text, values) })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readLanguage)
  const value = useMemo<LanguageContextValue>(() => ({ language, locale: locales[language], setLanguage, t: (text, values) => translate(language, text, values) }), [language])
  useLayoutEffect(() => {
    document.documentElement.lang = language
    try { window.localStorage.setItem(languageStorageKey, language) } catch { /* Language still works without storage. */ }
  }, [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useTranslation() { return useContext(LanguageContext) }

export function LanguagePicker() {
  const { language, setLanguage, t } = useTranslation()
  return <Dropdown trigger={['click']} placement="bottomRight" menu={{ selectable: true, selectedKeys: [language], items: [{ key: 'vi', label: <span lang="vi">Tiếng Việt</span> }, { key: 'en', label: <span lang="en">English</span> }], onClick: ({ key }) => { if (key === 'vi' || key === 'en') setLanguage(key) } }}>
    <Tooltip title={t('Đổi ngôn ngữ')}><Button type="text" className="language-trigger" aria-label={t('Ngôn ngữ')} icon={<GlobalOutlined />}>{language.toUpperCase()}</Button></Tooltip>
  </Dropdown>
}
