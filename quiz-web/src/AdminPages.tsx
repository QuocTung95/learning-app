import { useTranslation } from './i18n/LanguageProvider'
import type { Translator } from './i18n/translate'
import { useState } from 'react'
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd'
import { PlusOutlined, CodeOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api/client'
import type { AdminQuiz, CurrentUser, QuizStatus } from './api/types'

export const statusLabels: Record<QuizStatus, string> = { DRAFT: 'Bản nháp', ACTIVE: 'Đã phát hành', ARCHIVED: 'Đã lưu trữ' }
const roleLabels = { USER: 'Người dùng (USER)', ADMIN: 'Quản trị viên (ADMIN)' }
const errorMessage = (error: unknown, t: Translator) => error instanceof Error ? t(error.message) : t("Có lỗi xảy ra.")

export function AdminDashboard() {
  const { t } = useTranslation()
  const overview = useQuery({ queryKey: ['admin-overview'], queryFn: api.adminOverview })
  const recent = useQuery({ queryKey: ['admin-quizzes', 0, '', undefined], queryFn: () => api.adminQuizzes(0, '') })
  const stats = overview.data
  return <section className="crm-page">
    {overview.isError && <Alert type="error" message={errorMessage(overview.error, t)} action={<Button onClick={() => overview.refetch()}>{t("Thử lại")}</Button>} />}
    <div className="crm-stats">{[
      [t("Người dùng"), stats?.users], [t("Quản trị viên"), stats?.admins], [t("Danh mục"), stats?.categories],
      [t("Tổng bộ đề"), stats?.quizzes], [t("Bản nháp"), stats?.drafts], [t("Đã phát hành"), stats?.activeQuizzes], [t("Bài đã nộp"), stats?.submittedAttempts],
    ].map(([title, value]) => <Card key={title} loading={overview.isPending}><Statistic title={title} value={value ?? '—'} /></Card>)}</div>
    <Card className="crm-panel" title={t("Thao tác nhanh")}><Space wrap><Link to="/admin/quizzes/new"><Button type="primary" icon={<PlusOutlined />}>{t("Tạo bộ đề từ JSON")}</Button></Link><Link to="/admin/quizzes"><Button>{t("Quản lý bộ đề")}</Button></Link><Link to="/admin/categories"><Button>{t("Quản lý danh mục")}</Button></Link><Link to="/admin/users"><Button>{t("Quản lý người dùng")}</Button></Link><Link to="/admin/attempts"><Button>{t("Bài đã nộp")}</Button></Link></Space></Card>
    <Card className="crm-panel" title={t("Bộ đề mới nhất")} extra={<Link to="/admin/quizzes">{t("Xem tất cả")}</Link>}>
      {recent.isError && <Alert type="error" message={errorMessage(recent.error, t)} />}
      <Table rowKey="id" loading={recent.isPending} dataSource={recent.data?.content.slice(0, 5)} pagination={false} scroll={{ x: 650 }} columns={[
        { title: t("Bộ đề"), dataIndex: 'title' }, { title: t("Danh mục"), dataIndex: 'categoryName' },
        { title: t("Trạng thái"), dataIndex: 'status', render: (status: QuizStatus) => <QuizStatusTag status={status} /> },
      ]} />
    </Card>
  </section>
}

function QuizStatusTag({ status }: { status: QuizStatus }) {
  const { t } = useTranslation()
  return <Tag color={status === 'ACTIVE' ? 'green' : status === 'DRAFT' ? 'gold' : 'default'}>{t(statusLabels[status])}</Tag>
}

export function AdminQuizzesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<QuizStatus>()
  const [previewId, setPreviewId] = useState<number>()
  const quizzes = useQuery({ queryKey: ['admin-quizzes', page, search, status], queryFn: () => api.adminQuizzes(page, search, status) })
  const definition = useQuery({ queryKey: ['admin-definition', previewId], queryFn: () => api.adminQuizDefinition(previewId!), enabled: previewId !== undefined })
  const publish = useMutation({ mutationFn: api.publishQuiz, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] }); queryClient.invalidateQueries({ queryKey: ['admin-overview'] }) } })
  return <section className="crm-page">
    <div className="crm-toolbar"><Space wrap><Input.Search aria-label={t("Tìm bộ đề")} placeholder={t("Tìm theo tên bộ đề")} allowClear onSearch={value => { setSearch(value); setPage(0) }} style={{ width: 280 }} /><Select aria-label={t("Trạng thái bộ đề")} placeholder={t("Tất cả trạng thái")} allowClear value={status} style={{ width: 180 }} onChange={value => { setStatus(value); setPage(0) }} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label: t(label) }))} /></Space><Link to="/admin/quizzes/new"><Button type="primary" icon={<PlusOutlined />}>{t("Tạo bộ đề")}</Button></Link></div>
    {(quizzes.isError || publish.isError) && <Alert className="mb-24" type="error" message={errorMessage(quizzes.error ?? publish.error, t)} />}
    <Table<AdminQuiz> rowKey="id" loading={quizzes.isPending} dataSource={quizzes.data?.content} scroll={{ x: 1000 }} pagination={{ current: page + 1, pageSize: 20, total: quizzes.data?.totalElements, showSizeChanger: false, onChange: value => setPage(value - 1) }} columns={[
      { title: 'ID', dataIndex: 'id', width: 70 }, { title: t("Bộ đề"), dataIndex: 'title' }, { title: t("Danh mục"), dataIndex: 'categoryName' },
      { title: t("Trạng thái"), dataIndex: 'status', render: (value: QuizStatus) => <QuizStatusTag status={value} /> },
      { title: t("Người tạo"), dataIndex: 'createdBy' },
      { title: t("Thao tác"), width: 128, render: (_, quiz) => <Space size={6} className="quiz-table-actions"><Tooltip title={t("Xem JSON")}><Button aria-label={t("Xem JSON")} icon={<span className="json-action-icon" aria-hidden="true"><CodeOutlined /><small>JSON</small></span>} onClick={() => setPreviewId(quiz.id)} /></Tooltip>{quiz.status === 'DRAFT' && <Popconfirm title={t("Phát hành bộ đề này?")} description={t("Người dùng sẽ có thể mở liên kết và làm bài.")} onConfirm={() => publish.mutateAsync(quiz.id)} okText={t("Phát hành")} cancelText={t("Hủy")}><Tooltip title={t("Phát hành")}><Button aria-label={t("Phát hành")} icon={<SendOutlined />} type="primary" loading={publish.isPending && publish.variables === quiz.id} disabled={publish.isPending} /></Tooltip></Popconfirm>}{quiz.status === 'ACTIVE' && <Tooltip title={t("Mở bộ đề")}><Link to={`/quizzes/${quiz.id}`}><Button aria-label={t("Mở bộ đề")} icon={<EyeOutlined />} /></Link></Tooltip>}</Space> },
    ]} />
    <Modal title={t("Nội dung bộ đề #{0}", [previewId ?? ''])} open={previewId !== undefined} onCancel={() => setPreviewId(undefined)} footer={null} width={850}>
      {definition.isPending ? <Card loading /> : definition.isError ? <Alert type="error" message={errorMessage(definition.error, t)} /> : <><Typography.Paragraph type="secondary">{t("Nội dung dành cho quản trị viên, bao gồm đáp án.")}</Typography.Paragraph><textarea className="json-editor" aria-label={t("Nội dung JSON bộ đề")} readOnly value={JSON.stringify(definition.data, null, 2)} />{previewId !== undefined && <Typography.Paragraph className="mt-16" copyable>{`${window.location.origin}/quizzes/${previewId}`}</Typography.Paragraph>}</>}
    </Modal>
  </section>
}

export function AdminCategoriesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<{ code: string; name: string }>()
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories })
  const create = useMutation({ mutationFn: ({ code, name }: { code: string; name: string }) => api.createCategory(code, name), onSuccess: () => { form.resetFields(); queryClient.invalidateQueries({ queryKey: ['categories'] }); queryClient.invalidateQueries({ queryKey: ['admin-overview'] }) } })
  return <section className="crm-page">
    <Card className="crm-panel" title={t("Thêm danh mục")}>
      <Form form={form} layout="vertical" onFinish={values => create.mutate(values)} className="crm-category-form">
        <Form.Item label={t("Mã danh mục")} name="code" rules={[{ required: true, whitespace: true, message: t("Nhập mã danh mục") }, { max: 40 }]}><Input placeholder="ENGLISH" maxLength={40} /></Form.Item>
        <Form.Item label={t("Tên danh mục")} name="name" rules={[{ required: true, whitespace: true, message: t("Nhập tên danh mục") }, { max: 120 }]}><Input placeholder={t("Tiếng Anh")} maxLength={120} /></Form.Item>
        <Form.Item><Button type="primary" htmlType="submit" loading={create.isPending} icon={<PlusOutlined />}>{t("Thêm danh mục")}</Button></Form.Item>
      </Form>
      {create.isError && <Alert type="error" message={errorMessage(create.error, t)} />}{create.isSuccess && <Alert type="success" message={t("Đã thêm danh mục {0}", [create.data.code])} />}
    </Card>
    {categories.isError && <Alert type="error" message={errorMessage(categories.error, t)} />}
    <Table rowKey="id" loading={categories.isPending} dataSource={categories.data} scroll={{ x: 550 }} pagination={{ pageSize: 20, showSizeChanger: false }} columns={[{ title: 'ID', dataIndex: 'id', width: 90 }, { title: t("Mã danh mục"), dataIndex: 'code' }, { title: t("Tên danh mục"), dataIndex: 'name' }]} />
  </section>
}

export function AdminUsersPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const me = useQuery({ queryKey: ['me'], queryFn: api.currentUser })
  const users = useQuery({ queryKey: ['admin-users', page, search], queryFn: () => api.adminUsers(page, search) })
  const changeRole = useMutation({ mutationFn: ({ id, role }: { id: number; role: CurrentUser['roleCode'] }) => api.changeUserRole(id, role), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); queryClient.invalidateQueries({ queryKey: ['admin-overview'] }); queryClient.invalidateQueries({ queryKey: ['me'] }) } })
  return <section className="crm-page">
    <Alert className="mb-24" type="info" showIcon message={t("Tài khoản Google mới mặc định là USER. Thay đổi quyền có hiệu lực ngay; bạn không thể tự hạ quyền quản trị.")} />
    <Input.Search className="mb-24" aria-label={t("Tìm người dùng")} placeholder={t("Tìm theo email hoặc tên")} allowClear onSearch={value => { setSearch(value); setPage(0) }} style={{ maxWidth: 400 }} />
    {(users.isError || changeRole.isError) && <Alert className="mb-24" type="error" message={errorMessage(users.error ?? changeRole.error, t)} />}
    <Table<CurrentUser> rowKey="id" loading={users.isPending} dataSource={users.data?.content} scroll={{ x: 800 }} pagination={{ current: page + 1, pageSize: 20, total: users.data?.totalElements, showSizeChanger: false, onChange: value => setPage(value - 1) }} columns={[
      { title: 'ID', dataIndex: 'id', width: 70 }, { title: t("Tên"), dataIndex: 'displayName', render: (name: string | null) => name || '—' }, { title: 'Email', dataIndex: 'email' },
      { title: t("Quyền"), dataIndex: 'roleCode', render: (role: CurrentUser['roleCode']) => <Tag color={role === 'ADMIN' ? 'green' : 'blue'}>{t(roleLabels[role])}</Tag> },
      { title: t("Thao tác"), render: (_, user) => user.id === me.data?.id ? <Tag>{t("Tài khoản của bạn")}</Tag> : <Popconfirm title={t("Đổi quyền {0}?", [user.email])} description={t("Quyền mới: {0}.", [t(roleLabels[user.roleCode === 'ADMIN' ? 'USER' : 'ADMIN'])])} onConfirm={() => changeRole.mutateAsync({ id: user.id, role: user.roleCode === 'ADMIN' ? 'USER' : 'ADMIN' })} okText={t("Đổi quyền")} cancelText={t("Hủy")}><Button size="small" disabled={changeRole.isPending} loading={changeRole.isPending && changeRole.variables?.id === user.id}>{user.roleCode === 'ADMIN' ? t("Chuyển thành USER") : t("Cấp quyền ADMIN")}</Button></Popconfirm> },
    ]} />
  </section>
}
