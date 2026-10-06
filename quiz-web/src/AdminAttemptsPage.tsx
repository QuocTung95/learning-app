import { useTranslation } from './i18n/LanguageProvider'
import type { Translator } from './i18n/translate'
import { useState } from 'react'
import { Alert, Button, Card, Descriptions, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { FilterOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api } from './api/client'
import type { AdminAttempt, AdminAttemptDetail, AdminAttemptFilters, AdminQuestion, MatchingPair } from './api/types'

type AttemptFilterForm = Pick<AdminAttemptFilters, 'categoryId' | 'quizId' | 'user'> & { date?: string }

const dateText = (value: string, locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
const errorText = (error: unknown, t: Translator) => error instanceof Error ? t(error.message) : t("Có lỗi xảy ra.")
const durationText = (attempt: AdminAttempt, t: Translator) => {
  const seconds = Math.max(0, Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000))
  return t("{0} phút {1} giây", [Math.floor(seconds / 60), seconds % 60])
}

export default function AdminAttemptsPage() {
  const { t, locale } = useTranslation()
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
          <Form.Item label={t("Danh mục")} name="categoryId"><Select placeholder={t("Tất cả danh mục")} allowClear loading={categories.isPending} onChange={() => { form.setFieldValue('quizId', undefined); setQuizSearch('') }} options={categories.data?.map(item => ({ value: item.id, label: item.name }))} /></Form.Item>
          <Form.Item label={t("Bộ đề")} name="quizId"><Select placeholder={t("Tìm và chọn bộ đề")} allowClear showSearch filterOption={false} onSearch={setQuizSearch} loading={quizOptions.isFetching} options={quizOptions.data?.pages.flatMap(result => result.content).map(quiz => ({ value: quiz.id, label: `#${quiz.id} — ${quiz.title}` }))} onPopupScroll={event => { const element = event.currentTarget; if (element.scrollTop + element.clientHeight >= element.scrollHeight - 40 && quizOptions.hasNextPage && !quizOptions.isFetchingNextPage) quizOptions.fetchNextPage() }} popupRender={menu => <>{menu}{quizOptions.hasNextPage && <Button type="text" block loading={quizOptions.isFetchingNextPage} onClick={() => quizOptions.fetchNextPage()}>{t("Tải thêm bộ đề")}</Button>}</>} /></Form.Item>
          <Form.Item label={t("Người dùng")} name="user"><Input placeholder={t("Tên hoặc email")} allowClear /></Form.Item>
          <Form.Item label={t("Ngày nộp")} name="date"><Input type="date" aria-label={t("Ngày nộp")} /></Form.Item>
          <div className="filter-actions"><Tooltip title={t("Áp dụng bộ lọc")}><Button type="primary" htmlType="submit" aria-label={t("Áp dụng bộ lọc")} icon={<FilterOutlined />} loading={attempts.isFetching} /></Tooltip><Tooltip title={t("Xóa bộ lọc")}><Button type="text" aria-label={t("Xóa bộ lọc")} onClick={reset} icon={<ClearOutlined />} /></Tooltip></div>
        </div>
      </Form>
      {(categories.isError || quizOptions.isError) && <Alert className="mt-16" type="error" message={t("Chưa tải được danh sách bộ lọc")} description={errorText(categories.error ?? quizOptions.error, t)} />}
    </div>
    <div className="crm-toolbar submission-toolbar"><Typography.Text strong>{attempts.data ? t("{0} bài đã nộp phù hợp", [attempts.data.totalElements]) : t("Danh sách bài đã nộp")}</Typography.Text><Space><Select aria-label={t("Sắp xếp bài đã nộp")} className="submission-sort" variant="borderless" value={filters.order} onChange={order => { setPage(0); setFilters(current => ({ ...current, order })) }} options={[{ value: 'NEWEST', label: t("Mới nhất") }, { value: 'OLDEST', label: t("Cũ nhất") }, { value: 'SCORE_HIGH', label: t("Điểm cao nhất") }, { value: 'SCORE_LOW', label: t("Điểm thấp nhất") }]} /><Tooltip title={t("Làm mới")}><Button type="text" aria-label={t("Làm mới bài đã nộp")} icon={<ReloadOutlined />} loading={attempts.isFetching} onClick={() => attempts.refetch()} /></Tooltip></Space></div>
    {attempts.isError && <Alert className="mb-24" type="error" showIcon message={t("Không tải được bài đã nộp")} description={errorText(attempts.error, t)} />}
    <Table<AdminAttempt> className="submission-table" size="small" tableLayout="fixed" rowKey="attemptId" loading={attempts.isFetching} dataSource={attempts.data?.content} locale={{ emptyText: t("Không có bài đã nộp phù hợp bộ lọc.") }} scroll={{ x: 1450 }} pagination={{ current: page + 1, pageSize: size, total: attempts.data?.totalElements, showSizeChanger: true, pageSizeOptions: [20, 50, 100], onChange: (nextPage, nextSize) => { setPage(nextSize !== size ? 0 : nextPage - 1); setSize(nextSize) } }} columns={[
      { title: t("Mã bài"), dataIndex: 'attemptId', width: 70, render: (id: number) => `#${id}` },
      { title: t("Tên người dùng"), dataIndex: 'displayName', width: 160, ellipsis: { showTitle: false }, render: (name: string | null) => <CompactText value={name || '—'} /> },
      { title: 'Email', dataIndex: 'email', width: 220, ellipsis: { showTitle: false }, render: (email: string) => <CompactText value={email} /> },
      { title: t("Bộ đề"), dataIndex: 'quizTitle', width: 220, ellipsis: { showTitle: false }, render: (title: string) => <CompactText value={title} /> },
      { title: t("Danh mục"), dataIndex: 'categoryName', width: 120, ellipsis: { showTitle: false }, render: (name: string) => <CompactText value={name} /> },
      { title: t("Điểm"), width: 150, render: (_, row) => <Space size={6}><Typography.Text strong>{row.totalScore ?? '—'} / {row.maxScore}</Typography.Text><Tag color={row.percent !== null && row.percent >= 80 ? 'green' : 'blue'}>{row.percent ?? '—'}%</Tag></Space> },
      { title: t("Ngày nộp (VN)"), dataIndex: 'submittedAt', width: 180, render: (value: string) => dateText(value, locale) },
      { title: t("Thời gian làm"), width: 140, render: (_, row) => durationText(row, t) },
      { title: t("Lượt"), width: 90, render: (_, row) => <Tag>{row.retake ? t("Làm lại") : t("Luyện tập")}</Tag> },
      { title: t("Chi tiết"), width: 100, fixed: 'right', render: (_, row) => <Button size="small" onClick={() => setSelectedId(row.attemptId)}>{t("Xem bài")}</Button> },
    ]} />
    <Modal title={t("Chi tiết bài đã nộp #{0}", [selectedId ?? ''])} open={selectedId !== undefined} onCancel={() => setSelectedId(undefined)} footer={null} width={1150}>
      {detail.isPending ? <Card loading /> : detail.isError ? <Alert type="error" message={errorText(detail.error, t)} /> : detail.data && <AttemptDetail detail={detail.data} />}
    </Modal>
  </section>
}

function CompactText({ value }: { value: string }) {
  return <Tooltip title={value} placement="topLeft"><span className="table-cell-ellipsis">{value}</span></Tooltip>
}

function AttemptDetail({ detail }: { detail: AdminAttemptDetail }) {
  const { t, locale } = useTranslation()
  const { summary } = detail
  const rows = detail.definition.questions.map((question, index) => {
    const answer = detail.answers.find(item => item.questionId === question.id)
    let value: unknown = null
    if (answer) { try { value = JSON.parse(answer.responseJson) } catch { value = answer.responseJson } }
    return { key: question.id, index: index + 1, question, response: value, points: answer?.pointsAwarded ?? 0, answered: Boolean(answer) }
  })
  return <>
    <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} className="mb-24" items={[
      { key: 'user', label: t("Người dùng"), children: `${summary.displayName || '—'} (${summary.email})` },
      { key: 'quiz', label: t("Bộ đề"), children: t("{0} — phiên bản #{1}", [summary.quizTitle, summary.quizVersionId]) },
      { key: 'category', label: t("Danh mục"), children: summary.categoryName },
      { key: 'score', label: t("Điểm"), children: `${summary.totalScore ?? '—'} / ${summary.maxScore} (${summary.percent ?? '—'}%)` },
      { key: 'start', label: t("Bắt đầu (VN)"), children: dateText(summary.startedAt, locale) },
      { key: 'submitted', label: t("Nộp bài (VN)"), children: dateText(summary.submittedAt, locale) },
      { key: 'duration', label: t("Thời gian làm"), children: durationText(summary, t) },
      { key: 'retake', label: t("Loại lượt"), children: summary.retake ? t("Làm lại") : t("Luyện tập") },
    ]} />
    <Table rowKey="key" dataSource={rows} pagination={false} scroll={{ x: 950 }} columns={[
      { title: t("Câu"), dataIndex: 'index', width: 60 },
      { title: t("Câu hỏi"), width: 250, render: (_, row) => <Space direction="vertical" size={4}><Typography.Text>{row.question.prompt}</Typography.Text><Typography.Text type="secondary">{row.question.type}</Typography.Text></Space> },
      { title: t("Người dùng trả lời"), width: 240, render: (_, row) => formatAnswer(row.question, row.response, t) },
      { title: t("Đáp án đúng"), width: 240, render: (_, row) => formatExpected(row.question, t) },
      { title: t("Điểm / Kết quả"), width: 160, render: (_, row) => <Space direction="vertical" size={4}><Typography.Text>{row.points} / {row.question.points}</Typography.Text><Tag color={row.points === row.question.points ? 'green' : row.points > 0 ? 'gold' : 'red'}>{!row.answered ? t("Chưa trả lời") : row.points === row.question.points ? t("Đúng") : row.points > 0 ? t("Đúng một phần") : t("Sai")}</Tag></Space> },
    ]} />
  </>
}

function formatExpected(question: AdminQuestion, t: Translator): string {
  if (question.type === 'matching') return formatAnswer(question, question.correctPairs, t)
  if (question.type === 'short_answer') return question.acceptedAnswers?.join(' / ') || '—'
  return formatAnswer(question, question.type === 'multiple_choice' ? question.correctOptionIds : question.correctOptionId, t)
}

function formatAnswer(question: AdminQuestion, value: unknown, t: Translator): string {
  if (value === null || value === undefined || value === '') return t("Chưa trả lời")
  if (question.type === 'matching' && Array.isArray(value)) {
    return value.map((item: unknown) => {
      if (!item || typeof item !== 'object' || !('leftId' in item) || !('rightId' in item)) return '—'
      const pair = item as MatchingPair
      return `${question.left.find(left => left.id === pair.leftId)?.text ?? pair.leftId} → ${question.right.find(right => right.id === pair.rightId)?.text ?? (pair.rightId || t("Chưa ghép"))}`
    }).join('; ') || t("Chưa trả lời")
  }
  if ('options' in question) {
    const ids = Array.isArray(value) ? value : [value]
    return ids.map(id => question.options.find(option => option.id === id)?.text ?? String(id)).join('; ') || t("Chưa trả lời")
  }
  return typeof value === 'string' ? value : JSON.stringify(value)
}
