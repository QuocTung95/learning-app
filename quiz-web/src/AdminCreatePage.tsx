import { useState } from 'react'
import { Alert, Button, Card, Select, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api/client'
import type { ValidationError } from './api/types'

const questionTypes = ['single_choice', 'multiple_choice', 'dropdown', 'short_answer', 'matching']
const examples = [
  { id: 'q1', type: 'single_choice', prompt: 'She ___ to school.', points: 1, options: [{ id: 'a', text: 'go' }, { id: 'b', text: 'goes' }], correctOptionId: 'b' },
  { id: 'q2', type: 'multiple_choice', prompt: 'Chọn các danh từ.', points: 2, options: [{ id: 'a', text: 'book' }, { id: 'b', text: 'table' }, { id: 'c', text: 'quickly' }], correctOptionIds: ['a', 'b'] },
  { id: 'q3', type: 'dropdown', prompt: 'I ___ a student.', points: 1, options: [{ id: 'a', text: 'am' }, { id: 'b', text: 'is' }], correctOptionId: 'a' },
  { id: 'q4', type: 'short_answer', prompt: 'Viết dạng số nhiều của book.', points: 1, acceptedAnswers: ['books'] },
  { id: 'q5', type: 'matching', prompt: 'Ghép từ với nghĩa.', points: 2, left: [{ id: 'l1', text: 'cat' }, { id: 'l2', text: 'dog' }], right: [{ id: 'r1', text: 'mèo' }, { id: 'r2', text: 'chó' }], correctPairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }] },
]
function sample(categoryCode = 'ENGLISH') {
  return JSON.stringify({ schemaVersion: 1, categoryCode, title: 'Bài kiểm tra thử', description: 'Từ vựng và ngữ pháp cơ bản', durationMinutes: 10, questions: examples }, null, 2)
}
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Có lỗi xảy ra.'

export default function AdminCreatePage() {
  const queryClient = useQueryClient()
  const [rawJson, setRawJson] = useState(sample())
  const [localError, setLocalError] = useState('')
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories })
  const validate = useMutation({ mutationFn: () => api.validateDefinition(rawJson) })
  const create = useMutation({ mutationFn: () => api.createQuiz(rawJson), onSuccess: () => refreshLists() })
  const publish = useMutation({ mutationFn: () => api.publishQuiz(create.data!.quizId), onSuccess: () => refreshLists() })
  function refreshLists() {
    queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] })
    queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
  }
  function edit(value: string) {
    setRawJson(value); setLocalError(''); validate.reset(); create.reset(); publish.reset()
  }
  function formatJson() {
    try { edit(JSON.stringify(JSON.parse(rawJson), null, 2)) }
    catch { setLocalError('JSON chưa đúng cú pháp. Kiểm tra dấu ngoặc, dấu phẩy và dấu nháy kép.') }
  }
  function chooseCategory(categoryCode: string) {
    try {
      const parsed: unknown = JSON.parse(rawJson)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
      edit(JSON.stringify({ ...parsed, categoryCode }, null, 2))
    } catch { setLocalError('Cần sửa JSON đúng cú pháp trước khi đổi danh mục.') }
  }
  const locked = create.isPending || Boolean(create.data) || validate.isPending
  let preview: { title?: string; categoryCode?: string; durationMinutes?: number; questions?: unknown[] } | null = null
  try {
    const parsed: unknown = JSON.parse(rawJson)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) preview = parsed
  } catch { /* Validation reports JSON errors on request. */ }
  return <section className="crm-page">
    <div className="crm-toolbar"><Space wrap><Link to="/admin/quizzes"><Button>← Quản lý bộ đề</Button></Link><Button disabled={locked} onClick={() => edit(sample(categories.data?.[0]?.code))}>Dùng JSON mẫu</Button><Button disabled={locked} onClick={formatJson}>Định dạng JSON</Button></Space><Select aria-label="Danh mục cho bộ đề" placeholder="Chọn danh mục" loading={categories.isPending} disabled={locked} value={typeof preview?.categoryCode === 'string' ? preview.categoryCode : undefined} onChange={chooseCategory} options={categories.data?.map(category => ({ value: category.code, label: `${category.code} — ${category.name}` }))} style={{ minWidth: 250 }} /></div>
    {categories.isError && <Alert className="mb-24" type="error" message="Không tải được danh mục" description={errorMessage(categories.error)} />}
    {categories.isSuccess && categories.data.length === 0 && <Alert className="mb-24" type="warning" message="Chưa có danh mục" description={<Link to="/admin/categories">Thêm danh mục trước khi tạo bộ đề.</Link>} />}
    <div className="crm-editor-grid"><Card title="Nội dung JSON"><label className="sr-only" htmlFor="quiz-json">Dán JSON câu hỏi hoặc bộ đề</label><textarea id="quiz-json" className="json-editor" value={rawJson} disabled={locked} onChange={event => edit(event.target.value)} spellCheck={false} /><Space className="mt-16" wrap><Button disabled={locked} loading={validate.isPending} onClick={() => validate.mutate()}>Kiểm tra JSON</Button><Button type="primary" disabled={locked || (validate.isSuccess && validate.data.length > 0)} loading={create.isPending} onClick={() => create.mutate()}>Lưu bản nháp</Button></Space></Card>
      <Space direction="vertical" size={16} className="crm-editor-help"><Card title="Xem nhanh"><Typography.Paragraph strong>{typeof preview?.title === 'string' ? preview.title : 'Tên bộ đề'}</Typography.Paragraph><Space wrap><Tag>{Array.isArray(preview?.questions) ? preview.questions.length : 0} câu hỏi</Tag><Tag>{typeof preview?.durationMinutes === 'number' ? preview.durationMinutes : '—'} phút</Tag></Space><Typography.Paragraph className="mt-16" type="secondary">Bộ đề được lưu ở trạng thái nháp. Chỉ sau khi phát hành, người học mới có thể làm bài.</Typography.Paragraph></Card><Card title="Cấu trúc được hỗ trợ"><Typography.Paragraph>JSON gồm schemaVersion, categoryCode, title, durationMinutes và mảng questions.</Typography.Paragraph><Space wrap>{questionTypes.map(type => <Tag key={type}>{type}</Tag>)}</Space><Typography.Paragraph className="mt-16" type="secondary">Mỗi câu hỏi có id, type, prompt, points và phần đáp án tương ứng. JSON mẫu có đủ 5 dạng câu hỏi.</Typography.Paragraph><Link to="/admin/categories">Quản lý danh mục →</Link></Card></Space>
    </div>
    {localError && <Alert className="mt-16" type="error" message={localError} />}
    {validate.isSuccess && <ValidationResult errors={validate.data} />}
    {(validate.isError || create.isError || publish.isError) && <Alert className="mt-16" type="error" message={errorMessage(validate.error ?? create.error ?? publish.error)} />}
    {create.data && <Alert className="mt-16" type="success" message={`Đã ${publish.data ? 'phát hành' : 'lưu bản nháp'} bộ đề #${create.data.quizId}`} description={<Space direction="vertical">{publish.data ? <><Link to={`/quizzes/${create.data.quizId}`}>Mở bộ đề đã phát hành</Link><Typography.Text copyable>{`${window.location.origin}/quizzes/${create.data.quizId}`}</Typography.Text></> : <Button type="primary" loading={publish.isPending} onClick={() => publish.mutate()}>Phát hành bộ đề</Button>}<Button disabled={publish.isPending} onClick={() => edit(sample(categories.data?.[0]?.code))}>Tạo bộ đề khác</Button></Space>} />}
  </section>
}

function ValidationResult({ errors }: { errors: ValidationError[] }) {
  return <Alert className="mt-16" type={errors.length ? 'error' : 'success'} message={errors.length ? `${errors.length} lỗi cần sửa` : 'JSON hợp lệ'} description={errors.length ? <ul>{errors.map((error, index) => <li key={index}><code>{error.path}</code>: {error.message}</li>)}</ul> : 'Bạn có thể lưu bản nháp.'} />
}
