import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Layout, Menu, Space, Tag, Typography, Input, Pagination, Empty } from 'antd'
import { AppstoreOutlined, FileAddOutlined, LoginOutlined, LogoutOutlined, DashboardOutlined, TeamOutlined, FolderOutlined, UnorderedListOutlined, SolutionOutlined, HomeOutlined, ArrowRightOutlined, ClockCircleOutlined, CheckCircleOutlined, ReloadOutlined, ReadOutlined } from '@ant-design/icons'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './api/client'
import type { Answers, Question } from './api/types'
import { AdminDashboard, AdminQuizzesPage, AdminCategoriesPage, AdminUsersPage } from './AdminPages'
import AdminCreatePage from './AdminCreatePage'
import AdminAttemptsPage from './AdminAttemptsPage'
import { ThemePicker, useAppTheme } from './AppTheme'
import ResultPage from './ResultPage'

const { Header, Sider, Content } = Layout
function useCurrentUser() {
  return useQuery({ queryKey: ['me'], queryFn: api.currentUser, retry: false, staleTime: 0 })
}

function rememberLoginDestination(path: string) {
  if (path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/login')) {
    try { window.sessionStorage.setItem('quiz-login-return-to', path) } catch { /* Navigation still works without storage. */ }
  }
}

function loginDestination(role: 'USER' | 'ADMIN') {
  let path: string | null = null
  try {
    path = window.sessionStorage.getItem('quiz-login-return-to')
    window.sessionStorage.removeItem('quiz-login-return-to')
  } catch { /* Fall back to home. */ }
  const safePath = path?.startsWith('/') && !path.startsWith('//') && !path.startsWith('/login') ? path : '/'
  if (role === 'ADMIN') return safePath.startsWith('/admin') ? safePath : '/admin'
  return safePath.startsWith('/admin') ? '/' : safePath
}

function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/login/success" element={<LoginSuccessPage />} />
    <Route path="/forbidden" element={<SimplePage title="Không có quyền truy cập" />} />
    <Route element={<AppLayout />}>
      <Route path="/" element={<HomePage adminLanding />} />
      <Route path="/explore" element={<QuizCatalogPage />} />
      <Route path="/quizzes/:quizId" element={<QuizPage />} />
      <Route element={<RequireLogin />}><Route path="/attempts/:attemptId" element={<AttemptPage />} /><Route path="/attempts/:attemptId/result" element={<ResultPage />} /></Route>
      <Route path="/admin" element={<AdminGuard />}>
        <Route index element={<AdminDashboard />} />
        <Route path="quizzes" element={<AdminQuizzesPage />} />
        <Route path="quizzes/new" element={<AdminCreatePage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="attempts" element={<AdminAttemptsPage />} />
      </Route>
    </Route>
    <Route path="*" element={<SimplePage title="Không tìm thấy trang" />} />
  </Routes>
}

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { mode } = useAppTheme()
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  const me = useCurrentUser()
  const queryClient = useQueryClient()
  const admin = me.data?.roleCode === 'ADMIN'
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => { queryClient.clear(); navigate('/login') },
  })
  const items = [
    ...(!admin ? [{ key: '/', icon: <HomeOutlined />, label: <Link to="/">Trang chủ</Link> }] : []),
    { key: '/explore', icon: <AppstoreOutlined />, label: <Link to="/explore">Khám phá</Link> },
    ...(admin ? [
      { key: '/admin', icon: <DashboardOutlined />, label: <Link to="/admin">Tổng quan quản trị</Link> },
      { key: '/admin/quizzes', icon: <UnorderedListOutlined />, label: <Link to="/admin/quizzes">Quản lý bộ đề</Link> },
      { key: '/admin/quizzes/new', icon: <FileAddOutlined />, label: <Link to="/admin/quizzes/new">Tạo câu hỏi / bộ đề</Link> },
      { key: '/admin/categories', icon: <FolderOutlined />, label: <Link to="/admin/categories">Danh mục</Link> },
      { key: '/admin/users', icon: <TeamOutlined />, label: <Link to="/admin/users">Người dùng & quyền</Link> },
      { key: '/admin/attempts', icon: <SolutionOutlined />, label: <Link to="/admin/attempts">Bài đã nộp</Link> },
    ] : []),
  ]
  return <Layout className="app-shell">
    <Sider collapsible collapsed={collapsed} collapsedWidth={64} breakpoint="lg" onBreakpoint={setCollapsed} onCollapse={setCollapsed} className="app-sider">
      <div className="brand-mark" title="Quizz App"><span className="brand-name">Quizz App</span></div>
      <Menu theme={mode} mode="inline" selectedKeys={[location.pathname]} items={items} />
    </Sider>
    <Layout>
      <Header className="app-header">
        <div><Typography.Text className="eyebrow">{location.pathname.startsWith('/admin') ? 'Quản trị' : 'Học tập'}</Typography.Text></div>
        <Space>
          <ThemePicker />
          {me.data ? <><Typography.Text className="account-name">{me.data.displayName ?? me.data.email}</Typography.Text><Tag color={admin ? 'green' : 'blue'}>{me.data.roleCode}</Tag><Button type="text" icon={<LogoutOutlined />} loading={logout.isPending} onClick={() => logout.mutate()}>Đăng xuất</Button></> : <Button type="primary" icon={<LoginOutlined />} onClick={() => { rememberLoginDestination(location.pathname + location.search); navigate('/login') }}>Đăng nhập / Đăng ký</Button>}
        </Space>
      </Header>
      <Content className="app-content">{logout.isError && <Alert className="mb-24" type="error" showIcon message="Chưa đăng xuất được" description={getErrorMessage(logout.error)} />}<Outlet /></Content>
    </Layout>
  </Layout>
}

function RequireLogin() {
  const me = useCurrentUser()
  const location = useLocation()
  if (me.isPending) return <Card loading />
  if (me.isError) return <Alert type="error" showIcon message="Không kiểm tra được phiên đăng nhập" description={getErrorMessage(me.error)} action={<Button onClick={() => me.refetch()}>Thử lại</Button>} />
  if (!me.data) {
    rememberLoginDestination(location.pathname + location.search)
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function AdminGuard() {
  const me = useCurrentUser()
  const location = useLocation()
  if (me.isPending) return <Card loading />
  if (me.isError) return <Alert type="error" message="Không kiểm tra được quyền truy cập" description={getErrorMessage(me.error)} />
  if (!me.data) {
    rememberLoginDestination(location.pathname + location.search)
    return <Navigate to="/login" replace />
  }
  return me.data.roleCode === 'ADMIN' ? <Outlet /> : <Navigate to="/forbidden" replace />
}

function LoginSuccessPage() {
  const me = useCurrentUser()
  const navigate = useNavigate()
  const completed = useRef(false)
  useEffect(() => {
    if (me.data && !completed.current) {
      completed.current = true
      navigate(loginDestination(me.data.roleCode), { replace: true })
    }
  }, [me.data, navigate])
  if (me.isPending || me.data) return <main className="login-page"><Card loading className="login-card" /></main>
  return <main className="login-page"><Card className="login-card"><Alert type="error" showIcon message="Chưa xác nhận được phiên đăng nhập" description={me.isError ? getErrorMessage(me.error) : 'Vui lòng mở ứng dụng bằng localhost và đăng nhập lại.'} /><Link to="/login">Về trang đăng nhập</Link></Card></main>
}

function LoginPage() {
  const me = useCurrentUser()
  const config = useQuery({ queryKey: ['auth-config'], queryFn: api.authConfig, retry: false })
  const location = useLocation()
  if (me.data) return <Navigate to={me.data.roleCode === 'ADMIN' ? '/admin' : '/'} replace />
  const googleError = new URLSearchParams(location.search).has('error')
  return <main className="login-page">
    <div className="login-theme-picker"><ThemePicker /></div>
    <Card className="login-card" bordered={false}>
      <Typography.Text className="eyebrow">Quizz App</Typography.Text>
      <Typography.Title>Học có nhịp.<br /><span className="accent">Tiến bộ có dấu.</span></Typography.Title>
      <Typography.Paragraph type="secondary">Đăng nhập hoặc đăng ký bằng tài khoản Google. Lần đầu đăng nhập, tài khoản học tập của bạn sẽ được tạo tự động.</Typography.Paragraph>
      {googleError && <Alert className="mb-24" type="error" showIcon message="Đăng nhập Google chưa thành công" description="Bạn có thể thử lại hoặc chọn tài khoản Google khác." />}
      {config.isError && <Alert className="mb-24" type="error" showIcon message="Chưa kết nối được máy chủ" description="Vui lòng kiểm tra backend và thử lại." action={<Button onClick={() => config.refetch()}>Thử lại</Button>} />}
      {config.data && !config.data.googleEnabled && <Alert className="mb-24" type="info" showIcon message="Đăng nhập Google chưa sẵn sàng" description="Hãy khởi động backend với cấu hình Google OAuth để tiếp tục." action={<Button onClick={() => config.refetch()}>Kiểm tra lại</Button>} />}
      <Button type="primary" size="large" block icon={<LoginOutlined />} loading={config.isPending} disabled={!config.data?.googleEnabled} onClick={() => { window.location.assign(config.data!.loginUrl) }}>Tiếp tục với Google</Button>
      <Typography.Paragraph type="secondary" className="mt-16">Ứng dụng không yêu cầu mật khẩu Gmail của bạn.</Typography.Paragraph>
      <Link to="/">← Về trang chủ</Link>
    </Card>
  </main>
}

function HomePage({ adminLanding = false }: { adminLanding?: boolean }) {
  const me = useCurrentUser()
  const navigate = useNavigate()
  if (adminLanding && me.data?.roleCode === 'ADMIN') return <Navigate to="/admin" replace />
  return <section className="explore-page">
    <div className="hero-grid learning-hero">
      <div>
        <Typography.Text className="eyebrow">MỖI NGÀY, THÊM MỘT CHÚT TIẾN BỘ</Typography.Text>
        <Typography.Title>Học điều mới.<br /><span className="accent">Vững thêm mỗi ngày.</span></Typography.Title>
        <Typography.Paragraph type="secondary" className="hero-copy">Biến những phút rảnh thành cơ hội khám phá. Chọn chủ đề bạn yêu thích, thử sức với từng câu hỏi và nhìn thấy tiến bộ qua mỗi lần luyện tập.</Typography.Paragraph>
        <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={() => navigate('/explore')}>Khám phá bộ đề</Button>
        <Typography.Paragraph type="secondary" className="hero-note">Làm lại thoải mái, học theo nhịp của bạn.</Typography.Paragraph>
      </div>
      <div className="learning-steps">
        <div><ReadOutlined /><div><Typography.Text strong>Chọn điều muốn học</Typography.Text><p>Khám phá các bộ đề theo chủ đề.</p></div></div>
        <div><CheckCircleOutlined /><div><Typography.Text strong>Thử sức từng câu</Typography.Text><p>Hoàn thành bài và nhận kết quả ngay.</p></div></div>
        <div><ReloadOutlined /><div><Typography.Text strong>Luyện tập, tiến bộ</Typography.Text><p>Quay lại bất cứ lúc nào, không giới hạn lượt.</p></div></div>
      </div>
    </div>
  </section>
}

function QuizCatalogPage() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories })
  const [categoryId, setCategoryId] = useState<number>()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const quizzes = useQuery({ queryKey: ['public-quizzes', page, search, categoryId], queryFn: () => api.publicQuizzes(page, search, categoryId) })
  return (
    <section id="quiz-catalog" className="quiz-catalog">
      <div className="catalog-heading"><div><Typography.Title level={3}>Hôm nay bạn muốn học gì?</Typography.Title><Typography.Text type="secondary">Chọn một bộ đề và bắt đầu hành trình của bạn.</Typography.Text></div><Input.Search className="catalog-search" placeholder="Tìm tên bộ đề" aria-label="Tìm bộ đề" allowClear onSearch={value => { setSearch(value.trim()); setPage(0) }} /></div>
      {categories.isError && <Alert className="mb-24" type="error" showIcon message="Không tải được danh mục" action={<Button onClick={() => categories.refetch()}>Thử lại</Button>} />}
      <div className="category-chips" aria-label="Lọc theo chủ đề">
        <Button type={categoryId === undefined ? 'primary' : 'default'} aria-pressed={categoryId === undefined} onClick={() => { setCategoryId(undefined); setPage(0) }}>Tất cả</Button>
        {categories.data?.map(category => <Button key={category.id} type={categoryId === category.id ? 'primary' : 'default'} aria-pressed={categoryId === category.id} onClick={() => { setCategoryId(category.id); setPage(0) }}>{category.name}</Button>)}
      </div>
      {quizzes.isPending && <Card loading />}
      {quizzes.isError && <Alert type="error" showIcon message="Không tải được bộ đề" description={getErrorMessage(quizzes.error)} action={<Button onClick={() => quizzes.refetch()}>Thử lại</Button>} />}
      <div className="public-quiz-grid">{quizzes.data?.content.map(quiz => <Card key={quiz.id} className="public-quiz-card" bordered={false}>
        <Tag>{quiz.categoryName}</Tag>
        <Typography.Title level={4}><Link to={`/quizzes/${quiz.id}`}>{quiz.title}</Link></Typography.Title>
        <div className="public-quiz-meta"><span><ReadOutlined /> {quiz.questionCount} câu hỏi</span><span><ClockCircleOutlined /> {quiz.durationMinutes} phút</span></div>
        <Link className="quiz-card-link" to={`/quizzes/${quiz.id}`}>Khám phá đề <ArrowRightOutlined /></Link>
      </Card>)}</div>
      {quizzes.isSuccess && !quizzes.data.content.length && <Empty description={search || categoryId ? 'Chưa có bộ đề phù hợp. Thử tìm kiếm hoặc chủ đề khác nhé.' : 'Các bộ đề mới đang được chuẩn bị. Hẹn bạn quay lại sớm!'} />}
      {quizzes.data && quizzes.data.totalElements > 12 && <Pagination className="catalog-pagination" current={page + 1} total={quizzes.data.totalElements} pageSize={12} showSizeChanger={false} onChange={value => setPage(value - 1)} />}
    </section>
  )
}

function QuizPage() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const id = Number(quizId)
  const quiz = useQuery({ queryKey: ['quiz', id], queryFn: () => api.quiz(id), enabled: Number.isFinite(id) })
  const me = useCurrentUser()
  const start = useMutation({ mutationFn: () => api.startAttempt(id), onSuccess: result => navigate(`/attempts/${result.attemptId}`) })
  if (quiz.isLoading) return <Card loading />
  if (quiz.isError || !quiz.data) return <Alert type="error" showIcon message="Không tải được bộ đề" description={getErrorMessage(quiz.error)} />
  return <section className="narrow-page"><Typography.Text className="eyebrow">{quiz.data.categoryCode}</Typography.Text><Typography.Title>{quiz.data.title}</Typography.Title><Typography.Paragraph type="secondary">{quiz.data.description}</Typography.Paragraph><div className="quiz-meta"><Tag>{quiz.data.durationMinutes} phút</Tag><Tag>{quiz.data.questions.length} câu hỏi</Tag></div><Card bordered={false} className="start-card"><Typography.Title level={4}>Sẵn sàng bắt đầu?</Typography.Title><Typography.Paragraph type="secondary">Thời gian bắt đầu tính khi bạn vào bài. Nộp bài để xem kết quả; bạn có thể luyện tập lại bao nhiêu lần tùy thích.</Typography.Paragraph><Button type="primary" size="large" onClick={() => { if (me.data) start.mutate(); else { rememberLoginDestination(`/quizzes/${id}`); navigate('/login') } }} loading={start.isPending} disabled={me.isPending}>{me.data ? 'Bắt đầu làm bài' : 'Đăng nhập để làm bài'}</Button>{start.isError && <Alert className="mt-16" type="error" message={getErrorMessage(start.error)} />}</Card></section>
}

function AttemptPage() {
  const { attemptId } = useParams()
  const id = Number(attemptId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const attempt = useQuery({
    queryKey: ['attempt', id], queryFn: () => api.attemptResult(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    refetchInterval: query => query.state.data?.status === 'IN_PROGRESS' ? 5000 : false,
  })
  const definition = useQuery({
    queryKey: ['attempt-definition', id], queryFn: () => api.attemptDefinition(id),
    enabled: attempt.data?.status === 'IN_PROGRESS',
  })
  const [answers, setAnswers] = useState<Answers>({})
  const [now, setNow] = useState(() => Date.now())
  const submit = useMutation({
    mutationFn: () => api.submitAttempt(id, answers),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attempt', id] })
      navigate(`/attempts/${id}/result`)
    },
  })
  useEffect(() => { setAnswers({}) }, [id])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  if (attempt.isLoading) return <Card loading />
  if (attempt.isError || !attempt.data) return <Alert type="error" showIcon message="Không tải được lượt làm bài" description={getErrorMessage(attempt.error)} />
  const data = attempt.data
  if (data.status !== 'IN_PROGRESS') return <Navigate to={`/attempts/${id}/result`} replace />
  const remaining = Math.max(0, new Date(data.expiresAt).getTime() - now)
  return <section className="attempt-page">
    <div className="attempt-top"><div><Typography.Text className="eyebrow">LƯỢT LÀM BÀI #{id}</Typography.Text><Typography.Title level={2}>{definition.data?.title ?? 'Tập trung vào từng câu.'}</Typography.Title></div><Tag color={remaining > 0 ? 'green' : 'red'}>{formatRemaining(remaining)}</Tag></div>
    <Alert className="mb-24" type="info" showIcon message="Thời gian được quyết định bởi server" description="Tải lại hoặc đóng trang sẽ mất câu trả lời chưa nộp. Thời hạn của lượt làm bài vẫn giữ nguyên." />
    {remaining <= 0 && <Alert className="mb-24" type="warning" message="Đã hết giờ. Đang kiểm tra trạng thái với server..." />}
    {definition.isLoading && <Card loading />}
    {definition.isError && <Alert type="error" showIcon message="Không tải được câu hỏi" description={getErrorMessage(definition.error)} />}
    <fieldset disabled={submit.isPending || remaining <= 0} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="question-list">{definition.data?.questions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} value={answers[question.id]} onChange={value => setAnswers(current => ({ ...current, [question.id]: value }))} />)}</div>
    </fieldset>
    {submit.isError && <Alert className="mb-24" type="error" showIcon message="Chưa nộp được bài" description={`${getErrorMessage(submit.error)} Câu trả lời vẫn còn trên trang; bạn có thể thử lại khi còn thời gian.`} />}
    <Button type="primary" size="large" loading={submit.isPending} onClick={() => submit.mutate()} disabled={remaining <= 0 || !definition.data}>Nộp bài</Button>
  </section>
}

function QuestionCard({ question, index, value, onChange }: { question: Question; index: number; value: Answers[string]; onChange: (value: Answers[string]) => void }) {
  return <Card bordered={false} className="question-card"><div className="question-heading"><Tag>Q{index + 1}</Tag><Typography.Text type="secondary">{question.points} điểm</Typography.Text></div><Typography.Title level={4}>{question.prompt}</Typography.Title><QuestionInput question={question} value={value} onChange={onChange} /></Card>
}

function QuestionInput({ question, value, onChange }: { question: Question; value: Answers[string]; onChange: (value: Answers[string]) => void }) {
  if (question.type === 'short_answer') return <input className="answer-input" value={typeof value === 'string' ? value : ''} onChange={event => onChange(event.target.value)} placeholder="Nhập câu trả lời..." />
  if (question.type === 'matching') { const pairs = isMatchingPairs(value) ? value : []; return <div className="matching-list">{question.left.map(left => <label key={left.id} className="matching-row"><span>{left.text}</span><select value={pairs.find(pair => pair.leftId === left.id)?.rightId ?? ''} onChange={event => { const next = pairs.filter(pair => pair.leftId !== left.id); onChange([...next, { leftId: left.id, rightId: event.target.value }]) }}><option value="">Chọn...</option>{question.right.map(right => <option key={right.id} value={right.id}>{right.text}</option>)}</select></label>)}</div> }
  if (question.type === 'multiple_choice') { const selected = isStringArray(value) ? value : []; return <div className="option-list">{question.options.map(option => <label key={option.id} className="option-row"><input type="checkbox" checked={selected.includes(option.id)} onChange={event => { const current = selected; onChange(event.target.checked ? [...current, option.id] : current.filter(id => id !== option.id)) }} />{option.text}</label>)}</div> }
  if (question.type === 'dropdown') return <select className="answer-select" value={typeof value === 'string' ? value : ''} onChange={event => onChange(event.target.value)}><option value="">Chọn một đáp án...</option>{question.options.map(option => <option key={option.id} value={option.id}>{option.text}</option>)}</select>
  return <div className="option-list">{question.options.map(option => <label key={option.id} className="option-row"><input type="radio" name={question.id} checked={value === option.id} onChange={() => onChange(option.id)} />{option.text}</label>)}</div>
}

function SimplePage({ title }: { title: string }) { return <section className="narrow-page"><Card bordered={false}><Typography.Title>{title}</Typography.Title><Link to="/">Về trang chủ</Link></Card></section> }
function getErrorMessage(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Có lỗi không xác định.' }
function formatRemaining(milliseconds: number) { const seconds = Math.floor(milliseconds / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }
function isStringArray(value: Answers[string]): value is string[] { return Array.isArray(value) && value.every(item => typeof item === 'string') }
function isMatchingPairs(value: Answers[string]): value is { leftId: string; rightId: string }[] { return Array.isArray(value) && value.every(item => typeof item === 'object' && item !== null && 'leftId' in item && 'rightId' in item) }



export default App
