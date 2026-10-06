const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const src = path.resolve(__dirname, '../src')
function loadTypeScript(relative) {
  const filename = path.join(src, relative)
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const loaded = new Module(filename, module)
  loaded.filename = filename
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  loaded._compile(compiled, filename)
  return loaded.exports
}
const { translate, readLanguage, languageStorageKey } = loadTypeScript('i18n/translate.ts')
const { questionResults } = loadTypeScript('resultPresentation.ts')
const english = require('../src/i18n/en.json')

test('translates both languages, reorders parameters, and preserves unknown data and spacing', () => {
  assert.equal(translate('en', 'Xem JSON'), 'View JSON')
  assert.equal(translate('vi', 'Xem JSON'), 'Xem JSON')
  assert.equal(translate('en', 'Đã {0} bộ đề #{1}', ['published', 0]), 'Quiz #0 has been published')
  assert.equal(translate('vi', '{0} phút {1} giây', [0, 5]), '0 phút 5 giây')
  assert.equal(translate('en', ' câu hỏi '), ' questions ')
  assert.equal(translate('en', '   '), '   ')
  assert.equal(translate('en', 'User-provided title'), 'User-provided title')
  assert.equal(translate('en', 'constructor'), 'constructor')
  assert.equal(translate('en', '__proto__'), '__proto__')
})

test('restores the language preference and falls back safely when storage is invalid or blocked', () => {
  const previousWindow = global.window
  try {
    global.window = { localStorage: { getItem: key => key === languageStorageKey ? 'en' : null } }
    assert.equal(readLanguage(), 'en')
    global.window.localStorage.getItem = () => 'unknown'
    assert.equal(readLanguage(), 'vi')
    global.window.localStorage.getItem = () => { throw new Error('Storage blocked') }
    assert.equal(readLanguage(), 'vi')
    delete global.window
    assert.equal(readLanguage(), 'vi')
  } finally {
    if (previousWindow === undefined) delete global.window
    else global.window = previousWindow
  }
})

test('every translation preserves its interpolation parameters', () => {
  const placeholders = value => [...value.matchAll(/\{\d+\}/g)].map(match => match[0]).sort()
  for (const [source, target] of Object.entries(english)) {
    assert.ok(target.trim(), `Empty translation: ${source}`)
    assert.deepEqual(placeholders(target), placeholders(source), `Parameter mismatch: ${source}`)
  }
})

test('all static translation keys in UI code have English entries', () => {
  const missing = new Set()
  const files = ['App.tsx', 'AppTheme.tsx', 'AdminPages.tsx', 'AdminAttemptsPage.tsx', 'AdminCreatePage.tsx', 'ResultPage.tsx', 'resultPresentation.ts', 'i18n/LanguageProvider.tsx']
  for (const file of files) {
    const ast = ts.createSourceFile(file, fs.readFileSync(path.join(src, file), 'utf8'), ts.ScriptTarget.Latest, true)
    const visit = node => {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 't') {
        const visitKey = key => {
          if (ts.isStringLiteral(key) && !Object.hasOwn(english, key.text.trim())) missing.add(key.text.trim())
          if (ts.isConditionalExpression(key)) { visitKey(key.whenTrue); visitKey(key.whenFalse) }
        }
        visitKey(node.arguments[0])
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  assert.deepEqual([...missing], [])
})

test('result descriptions change language without changing answers or scores', () => {
  const questions = [
    { id: 'match', type: 'matching', prompt: 'Ghép từ', points: 2, left: [{ id: 'l1', text: 'Mèo' }, { id: 'l2', text: 'Chó' }], right: [{ id: 'r1', text: 'Cat' }] },
    { id: 'choice', type: 'single_choice', prompt: 'Chọn', points: 1, options: [{ id: 'a', text: 'Đáp án gốc' }] },
  ]
  const answers = [{ questionId: 'match', responseJson: '[{"leftId":"l1","rightId":"r1"}]', pointsAwarded: 1 }, { questionId: 'choice', responseJson: '"a"', pointsAwarded: 1 }]
  const original = JSON.stringify({ questions, answers })
  const vi = questionResults(questions, answers, (key, values) => translate('vi', key, values))
  const en = questionResults(questions, answers, (key, values) => translate('en', key, values))
  assert.equal(vi[0].answerLines[1], 'Chó → Chưa ghép')
  assert.equal(en[0].answerLines[1], 'Chó → Not matched')
  assert.deepEqual(en[1].answerLines, ['Đáp án gốc'])
  assert.deepEqual(vi.map(row => [row.points, row.state]), en.map(row => [row.points, row.state]))
  assert.equal(JSON.stringify({ questions, answers }), original)
})
