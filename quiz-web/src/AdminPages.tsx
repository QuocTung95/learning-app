import { useState } from 'react'
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Statistic, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api/client'
import type { AdminQuiz, CurrentUser, QuizStatus } from './api/types'

export const statusLabels: Record<QuizStatus, string> = { DRAFT: 'Bản nháp', ACTIVE: 'Đã phát hành', ARCHIVED: 'Đã lưu trữ' }
const roleLabels = { USER: 'Người dùng', ADMIN: 'Quản trị viên' }
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Có lỗi xảy ra.'

export function AdminDashboard() {
  const overview = useQuery({ queryKey: ['admin-overview'], queryFn: api.adminOverview })
  const recent = useQuery({ queryKey: ['admin-quizzes', 0, '', undefined], queryFn: () => api.adminQuizzes(0, '') })
  const stats = overview.data
  return <section className="crm-page">
    {overview.isError && <Alert type="error" message={errorMessage(overview.error)} action={<Button onClick={() => overview.refetch()}>Thử lại</Button>} />}
    <div className="crm-stats">{[
      ['Người dùng', stats?.users], ['Quản trị viên', stats?.admins], ['Danh mục', stats?.categories],
      ['Tổng bộ đề', stats?.quizzes], ['Bản nháp', stats?.drafts], ['Đã phát hành', stats?.activeQuizzes], ['Bài đã nộp', stats?.submittedAttempts],
    ].map(([title, value]) => <Card key={title} loading={overview.isPending}><Statistic title={title} value={value ?? '—'} /></Card>)}</div>
    <Card className="crm-panel" title="Thao tác nhanh"><Space wrap><Link to="/admin/quizzes/new"><Button type="primary" icon={<PlusOutlined />}>Tạo bộ đề từ JSON</Button></Link><Link to="/admin/quizzes"><Button>Quản lý bộ đề</Button></Link><Link to="/admin/categories"><Button>Quản lý danh mục</Button></Link><Link to="/admin/users"><Button>Quản lý người dùng</Button></Link><Link to="/admin/attempts"><Button>Bài đã nộp</Button></Link></Space></Card>
    <Card className="crm-panel" title="Bộ đề mới nhất" extra={<Link to="/admin/quizzes">Xem tất cả</Link>}>
      {recent.isError && <Alert type="error" message={errorMessage(recent.error)} />}
      <Table rowKey="id" loading={recent.isPending} dataSource={recent.data?.content.slice(0, 5)} pagination={false} scroll={{ x: 650 }} columns={[
        { title: 'Bộ đề', dataIndex: 'title' }, { title: 'Danh mục', dataIndex: 'categoryName' },
        { title: 'Trạng thái', dataIndex: 'status', render: (status: QuizStatus) => <QuizStatusTag status={status} /> },
      ]} />
    </Card>
  </section>
}

function QuizStatusTag({ status }: { status: QuizStatus }) {
  return <Tag color={status === 'ACTIVE' ? 'green' : status === 'DRAFT' ? 'gold' : 'default'}>{statusLabels[status]}</Tag>
}

export function AdminQuizzesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<QuizStatus>()
  const [previewId, setPreviewId] = useState<number>()
  const quizzes = useQuery({ queryKey: ['admin-quizzes', page, search, status], queryFn: () => api.adminQuizzes(page, search, status) })
  const definition = useQuery({ queryKey: ['admin-definition', previewId], queryFn: () => api.adminQuizDefinition(previewId!), enabled: previewId !== undefined })
  const publish = useMutation({ mutationFn: api.publishQuiz, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] }); queryClient.invalidateQueries({ queryKey: ['admin-overview'] }) } })
  return <section className="crm-page">
    <div className="crm-toolbar"><Space wrap><Input.Search aria-label="Tìm bộ đề" placeholder="Tìm theo tên bộ đề" allowClear onSearch={value => { setSearch(value); setPage(0) }} style={{ width: 280 }} /><Select aria-label="Trạng thái bộ đề" placeholder="Tất cả trạng thái" allowClear value={status} style={{ width: 180 }} onChange={value => { setStatus(value); setPage(0) }} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /></Space><Link to="/admin/quizzes/new"><Button type="primary" icon={<PlusOutlined />}>Tạo bộ đề</Button></Link></div>
    {(quizzes.isError || publish.isError) && <Alert className="mb-24" type="error" message={errorMessage(quizzes.error ?? publish.error)} />}
    <Table<AdminQuiz> rowKey="id" loading={quizzes.isPending} dataSource={quizzes.data?.content} scroll={{ x: 1000 }} pagination={{ current: page + 1, pageSize: 20, total: quizzes.data?.totalElements, showSizeChanger: false, onChange: value => setPage(value - 1) }} columns={[
      { title: 'ID', dataIndex: 'id', width: 70 }, { title: 'Bộ đề', dataIndex: 'title' }, { title: 'Danh mục', dataIndex: 'categoryName' },
      { title: 'Trạng thái', dataIndex: 'status', render: (value: QuizStatus) => <QuizStatusTag status={value} /> },
      { title: 'Người tạo', dataIndex: 'createdBy' },
      { title: 'Thao tác', render: (_, quiz) => <Space wrap><Button size="small" onClick={() => setPreviewId(quiz.id)}>Xem JSON</Button>{quiz.status === 'DRAFT' && <Popconfirm title="Phát hành bộ đề này?" description="Người dùng sẽ có thể mở liên kết và làm bài." onConfirm={() => publish.mutateAsync(quiz.id)} okText="Phát hành" cancelText="Hủy"><Button size="small" type="primary" loading={publish.isPending && publish.variables === quiz.id} disabled={publish.isPending}>Phát hành</Button></Popconfirm>}{quiz.status === 'ACTIVE' && <Link to={`/quizzes/${quiz.id}`}><Button size="small">Mở bộ đề</Button></Link>}</Space> },
    ]} />
    <Modal title={`Nội dung bộ đề #${previewId ?? ''}`} open={previewId !== undefined} onCancel={() => setPreviewId(undefined)} footer={null} width={850}>
      {definition.isPending ? <Card loading /> : definition.isError ? <Alert type="error" message={errorMessage(definition.error)} /> : <><Typography.Paragraph type="secondary">Nội dung dành cho quản trị viên, bao gồm đáp án.</Typography.Paragraph><textarea className="json-editor" aria-label="Nội dung JSON bộ đề" readOnly value={JSON.stringify(definition.data, null, 2)} />{previewId !== undefined && <Typography.Paragraph className="mt-16" copyable>{`${window.location.origin}/quizzes/${previewId}`}</Typography.Paragraph>}</>}
    </Modal>
  </section>
}

export function AdminCategoriesPage() {
  const queryClient = useQueryClient()
  const [form] = Form.useForm<{ code: string; name: string }>()
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories })
  const create = useMutation({ mutationFn: ({ code, name }: { code: string; name: string }) => api.createCategory(code, name), onSuccess: () => { form.resetFields(); queryClient.invalidateQueries({ queryKey: ['categories'] }); queryClient.invalidateQueries({ queryKey: ['admin-overview'] }) } })
  return <section className="crm-page">
    <Card className="crm-panel" title="Thêm danh mục">
      <Form form={form} layout="vertical" onFinish={values => create.mutate(values)} className="crm-category-form">
        <Form.Item label="Mã danh mục" name="code" rules={[{ required: true, whitespace: true, message: 'Nhập mã danh mục' }, { max: 40 }]}><Input placeholder="ENGLISH" maxLength={40} /></Form.Item>
        <Form.Item label="Tên danh mục" name="name" rules={[{ required: true, whitespace: true, message: 'Nhập tên danh mục' }, { max: 120 }]}><Input placeholder="Tiếng Anh" maxLength={120} /></Form.Item>
        <Form.Item><Button type="primary" htmlType="submit" loading={create.isPending} icon={<PlusOutlined />}>Thêm danh mục</Button></Form.Item>
      </Form>
      {create.isError && <Alert type="error" message={errorMessage(create.error)} />}{create.isSuccess && <Alert type="success" message={`Đã thêm danh mục ${create.data.code}`} />}
    </Card>
    {categories.isError && <Alert type="error" message={errorMessage(categories.error)} />}
    <Table rowKey="id" loading={categories.isPending} dataSource={categories.data} pagination={{ pageSize: 20, showSizeChanger: false }} columns={[{ title: 'ID', dataIndex: 'id', width: 90 }, { title: 'Mã danh mục', dataIndex: 'code' }, { title: 'Tên danh mục', dataIndex: 'name' }]} />
  </section>
}

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const me = useQuery({ queryKey: ['me'], queryFn: api.currentUser })
  const users = useQuery({ queryKey: ['admin-users', page, search], queryFn: () => api.adminUsers(page, search) })
  const changeRole = useMutation({ mutationFn: ({ id, role }: { id: number; role: CurrentUser['roleCode'] }) => api.changeUserRole(id, role), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); queryClient.invalidateQueries({ queryKey: ['admin-overview'] }); queryClient.invalidateQueries({ queryKey: ['me'] }) } })
  return <section className="crm-page">
    <Alert className="mb-24" type="info" showIcon message="Tài khoản Google mới mặc định là USER. Thay đổi quyền có hiệu lực ngay; bạn không thể tự hạ quyền quản trị." />
    <Input.Search className="mb-24" aria-label="Tìm người dùng" placeholder="Tìm theo email hoặc tên" allowClear onSearch={value => { setSearch(value); setPage(0) }} style={{ maxWidth: 400 }} />
    {(users.isError || changeRole.isError) && <Alert className="mb-24" type="error" message={errorMessage(users.error ?? changeRole.error)} />}
    <Table<CurrentUser> rowKey="id" loading={users.isPending} dataSource={users.data?.content} scroll={{ x: 800 }} pagination={{ current: page + 1, pageSize: 20, total: users.data?.totalElements, showSizeChanger: false, onChange: value => setPage(value - 1) }} columns={[
      { title: 'ID', dataIndex: 'id', width: 70 }, { title: 'Tên', dataIndex: 'displayName', render: (name: string | null) => name || '—' }, { title: 'Email', dataIndex: 'email' },
      { title: 'Quyền', dataIndex: 'roleCode', render: (role: CurrentUser['roleCode']) => <Tag color={role === 'ADMIN' ? 'green' : 'blue'}>{roleLabels[role]}</Tag> },
      { title: 'Thao tác', render: (_, user) => user.id === me.data?.id ? <Tag>Tài khoản của bạn</Tag> : <Popconfirm title={`Đổi quyền ${user.email}?`} description={`Quyền mới: ${user.roleCode === 'ADMIN' ? 'Người dùng' : 'Quản trị viên'}.`} onConfirm={() => changeRole.mutateAsync({ id: user.id, role: user.roleCode === 'ADMIN' ? 'USER' : 'ADMIN' })} okText="Đổi quyền" cancelText="Hủy"><Button size="small" disabled={changeRole.isPending} loading={changeRole.isPending && changeRole.variables?.id === user.id}>{user.roleCode === 'ADMIN' ? 'Chuyển thành USER' : 'Cấp quyền ADMIN'}</Button></Popconfirm> },
    ]} />
  </section>
}
