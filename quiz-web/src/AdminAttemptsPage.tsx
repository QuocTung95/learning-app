import { useState } from 'react'
import { Alert, Button, Card, Descriptions, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { FilterOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api } from './api/client'
import type { AdminAttempt, AdminAttemptDetail, AdminAttemptFilters, AdminQuestion, MatchingPair } from './api/types'

type AttemptFilterForm = Pick<AdminAttemptFilters, 'categoryId' | 'quizId' | 'user'> & { date?: string }

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' })
const dateText = (value: string) => dateFormatter.format(new Date(value))
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Có lỗi xảy ra.'
const durationText = (attempt: AdminAttempt) => {
  const seconds = Math.max(0, Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000))
  return `${Math.floor(seconds / 60)} phút ${seconds % 60} giây`
}

export default function AdminAttemptsPage() {
  const [form] = Form.useForm<AttemptFilterForm>()
  const [filters, setFilters] = useState<AdminAttemptFilters>({ order: 'NEWEST' })
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [quizSearch, setQuizSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number>()
  const draftCategory = Form.useWatch('categoryId', form) as number | undefined
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories })
  const quizOptions = useInfiniteQuery({
    queryKey: ['admin-attempt-quiz-options', quizSearch, draftCategory], initialPageParam: 0,
    queryFn: ({ pageParam }) => api.adminQuizzes(pageParam, quizSearch, undefined, draftCategory),
    getNextPageParam: result => result.number + 1 < result.totalPages ? result.number + 1 : undefined,
  })
  const attempts = useQuery({ queryKey: ['admin-attempts', page, size, filters], queryFn: () => api.adminAttempts(page, size, filters) })
  const detail = useQuery({ queryKey: ['admin-attempt-detail', selectedId], queryFn: () => api.adminAttemptDetail(selectedId!), enabled: selectedId !== undefined })
  function apply(values: AttemptFilterForm) {
    setPage(0)
    setFilters({ categoryId: values.categoryId, quizId: values.quizId, user: values.user?.trim(), from: values.date || undefined, to: values.date || undefined, order: filters.order ?? 'NEWEST' })
  }
  function reset() {
    form.resetFields(); setQuizSearch(''); setPage(0); setFilters({ order: 'NEWEST' })
  }
  return <section className="crm-page">
    <div className="submission-filters">
      <Form form={form} layout="vertical" onFinish={apply}>
        <div className="attempt-filter-grid">
          <Form.Item label="Danh mục" name="categoryId"><Select placeholder="Tất cả danh mục" allowClear loading={categories.isPending} onChange={() => { form.setFieldValue('quizId', undefined); setQuizSearch('') }} options={categories.data?.map(item => ({ value: item.id, label: item.name }))} /></Form.Item>
          <Form.Item label="Bộ đề" name="quizId"><Select placeholder="Tìm và chọn bộ đề" allowClear showSearch filterOption={false} onSearch={setQuizSearch} loading={quizOptions.isFetching} options={quizOptions.data?.pages.flatMap(result => result.content).map(quiz => ({ value: quiz.id, label: `#${quiz.id} — ${quiz.title}` }))} onPopupScroll={event => { const element = event.currentTarget; if (element.scrollTop + element.clientHeight >= element.scrollHeight - 40 && quizOptions.hasNextPage && !quizOptions.isFetchingNextPage) quizOptions.fetchNextPage() }} popupRender={menu => <>{menu}{quizOptions.hasNextPage && <Button type="text" block loading={quizOptions.isFetchingNextPage} onClick={() => quizOptions.fetchNextPage()}>Tải thêm bộ đề</Button>}</>} /></Form.Item>
          <Form.Item label="Người dùng" name="user"><Input placeholder="Tên hoặc email" allowClear /></Form.Item>
          <Form.Item label="Ngày nộp" name="date"><Input type="date" aria-label="Ngày nộp" /></Form.Item>
          <div className="filter-actions"><Tooltip title="Áp dụng bộ lọc"><Button type="primary" htmlType="submit" aria-label="Áp dụng bộ lọc" icon={<FilterOutlined />} loading={attempts.isFetching} /></Tooltip><Tooltip title="Xóa bộ lọc"><Button type="text" aria-label="Xóa bộ lọc" onClick={reset} icon={<ClearOutlined />} /></Tooltip></div>
        </div>
      </Form>
      {(categories.isError || quizOptions.isError) && <Alert className="mt-16" type="error" message="Chưa tải được danh sách bộ lọc" description={errorText(categories.error ?? quizOptions.error)} />}
    </div>
    <div className="crm-toolbar submission-toolbar"><Typography.Text strong>{attempts.data ? `${attempts.data.totalElements} bài đã nộp phù hợp` : 'Danh sách bài đã nộp'}</Typography.Text><Space><Select aria-label="Sắp xếp bài đã nộp" className="submission-sort" variant="borderless" value={filters.order} onChange={order => { setPage(0); setFilters(current => ({ ...current, order })) }} options={[{ value: 'NEWEST', label: 'Mới nhất' }, { value: 'OLDEST', label: 'Cũ nhất' }, { value: 'SCORE_HIGH', label: 'Điểm cao nhất' }, { value: 'SCORE_LOW', label: 'Điểm thấp nhất' }]} /><Tooltip title="Làm mới"><Button type="text" aria-label="Làm mới bài đã nộp" icon={<ReloadOutlined />} loading={attempts.isFetching} onClick={() => attempts.refetch()} /></Tooltip></Space></div>
    {attempts.isError && <Alert className="mb-24" type="error" showIcon message="Không tải được bài đã nộp" description={errorText(attempts.error)} />}
    <Table<AdminAttempt> className="submission-table" size="small" tableLayout="fixed" rowKey="attemptId" loading={attempts.isFetching} dataSource={attempts.data?.content} locale={{ emptyText: 'Không có bài đã nộp phù hợp bộ lọc.' }} scroll={{ x: 1450 }} pagination={{ current: page + 1, pageSize: size, total: attempts.data?.totalElements, showSizeChanger: true, pageSizeOptions: [20, 50, 100], onChange: (nextPage, nextSize) => { setPage(nextSize !== size ? 0 : nextPage - 1); setSize(nextSize) } }} columns={[
      { title: 'Mã bài', dataIndex: 'attemptId', width: 70, render: (id: number) => `#${id}` },
      { title: 'Tên người dùng', dataIndex: 'displayName', width: 160, ellipsis: { showTitle: false }, render: (name: string | null) => <CompactText value={name || '—'} /> },
      { title: 'Email', dataIndex: 'email', width: 220, ellipsis: { showTitle: false }, render: (email: string) => <CompactText value={email} /> },
      { title: 'Bộ đề', dataIndex: 'quizTitle', width: 220, ellipsis: { showTitle: false }, render: (title: string) => <CompactText value={title} /> },
      { title: 'Danh mục', dataIndex: 'categoryName', width: 120, ellipsis: { showTitle: false }, render: (name: string) => <CompactText value={name} /> },
      { title: 'Điểm', width: 150, render: (_, row) => <Space size={6}><Typography.Text strong>{row.totalScore ?? '—'} / {row.maxScore}</Typography.Text><Tag color={row.percent !== null && row.percent >= 80 ? 'green' : 'blue'}>{row.percent ?? '—'}%</Tag></Space> },
      { title: 'Ngày nộp (VN)', dataIndex: 'submittedAt', width: 180, render: dateText },
      { title: 'Thời gian làm', width: 140, render: (_, row) => durationText(row) },
      { title: 'Lượt', width: 90, render: (_, row) => <Tag>{row.retake ? 'Làm lại' : 'Lần đầu'}</Tag> },
      { title: 'Chi tiết', width: 100, fixed: 'right', render: (_, row) => <Button size="small" onClick={() => setSelectedId(row.attemptId)}>Xem bài</Button> },
    ]} />
    <Modal title={`Chi tiết bài đã nộp #${selectedId ?? ''}`} open={selectedId !== undefined} onCancel={() => setSelectedId(undefined)} footer={null} width={1150}>
      {detail.isPending ? <Card loading /> : detail.isError ? <Alert type="error" message={errorText(detail.error)} /> : detail.data && <AttemptDetail detail={detail.data} />}
    </Modal>
  </section>
}

function CompactText({ value }: { value: string }) {
  return <Tooltip title={value} placement="topLeft"><span className="table-cell-ellipsis">{value}</span></Tooltip>
}

function AttemptDetail({ detail }: { detail: AdminAttemptDetail }) {
  const { summary } = detail
  const rows = detail.definition.questions.map((question, index) => {
    const answer = detail.answers.find(item => item.questionId === question.id)
    let value: unknown = null
    if (answer) { try { value = JSON.parse(answer.responseJson) } catch { value = answer.responseJson } }
    return { key: question.id, index: index + 1, question, response: value, points: answer?.pointsAwarded ?? 0, answered: Boolean(answer) }
  })
  return <>
    <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} className="mb-24" items={[
      { key: 'user', label: 'Người dùng', children: `${summary.displayName || '—'} (${summary.email})` },
      { key: 'quiz', label: 'Bộ đề', children: `${summary.quizTitle} — phiên bản #${summary.quizVersionId}` },
      { key: 'category', label: 'Danh mục', children: summary.categoryName },
      { key: 'score', label: 'Điểm', children: `${summary.totalScore ?? '—'} / ${summary.maxScore} (${summary.percent ?? '—'}%)` },
      { key: 'start', label: 'Bắt đầu (VN)', children: dateText(summary.startedAt) },
      { key: 'submitted', label: 'Nộp bài (VN)', children: dateText(summary.submittedAt) },
      { key: 'duration', label: 'Thời gian làm', children: durationText(summary) },
      { key: 'retake', label: 'Loại lượt', children: summary.retake ? 'Làm lại' : 'Lần đầu' },
    ]} />
    <Table rowKey="key" dataSource={rows} pagination={false} scroll={{ x: 950 }} columns={[
      { title: 'Câu', dataIndex: 'index', width: 60 },
      { title: 'Câu hỏi', width: 250, render: (_, row) => <Space direction="vertical" size={4}><Typography.Text>{row.question.prompt}</Typography.Text><Typography.Text type="secondary">{row.question.type}</Typography.Text></Space> },
      { title: 'Người dùng trả lời', width: 240, render: (_, row) => formatAnswer(row.question, row.response) },
      { title: 'Đáp án đúng', width: 240, render: (_, row) => formatExpected(row.question) },
      { title: 'Điểm / Kết quả', width: 160, render: (_, row) => <Space direction="vertical" size={4}><Typography.Text>{row.points} / {row.question.points}</Typography.Text><Tag color={row.points === row.question.points ? 'green' : row.points > 0 ? 'gold' : 'red'}>{!row.answered ? 'Chưa trả lời' : row.points === row.question.points ? 'Đúng' : row.points > 0 ? 'Đúng một phần' : 'Sai'}</Tag></Space> },
    ]} />
  </>
}

function formatExpected(question: AdminQuestion): string {
  if (question.type === 'matching') return formatAnswer(question, question.correctPairs)
  if (question.type === 'short_answer') return question.acceptedAnswers?.join(' / ') || '—'
  return formatAnswer(question, question.type === 'multiple_choice' ? question.correctOptionIds : question.correctOptionId)
}

function formatAnswer(question: AdminQuestion, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Chưa trả lời'
  if (question.type === 'matching' && Array.isArray(value)) {
    return value.map((item: unknown) => {
      if (!item || typeof item !== 'object' || !('leftId' in item) || !('rightId' in item)) return '—'
      const pair = item as MatchingPair
      return `${question.left.find(left => left.id === pair.leftId)?.text ?? pair.leftId} → ${question.right.find(right => right.id === pair.rightId)?.text ?? (pair.rightId || 'Chưa ghép')}`
    }).join('; ') || 'Chưa trả lời'
  }
  if ('options' in question) {
    const ids = Array.isArray(value) ? value : [value]
    return ids.map(id => question.options.find(option => option.id === id)?.text ?? String(id)).join('; ') || 'Chưa trả lời'
  }
  return typeof value === 'string' ? value : JSON.stringify(value)
}
