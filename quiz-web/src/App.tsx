import { useTranslation } from './i18n/LanguageProvider'
import type { Translator } from './i18n/translate'
import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Drawer, Grid, Layout, Menu, Space, Tag, Typography, Input, Pagination, Empty } from 'antd'
import { AppstoreOutlined, FileAddOutlined, LoginOutlined, LogoutOutlined, DashboardOutlined, TeamOutlined, FolderOutlined, UnorderedListOutlined, SolutionOutlined, HomeOutlined, ArrowRightOutlined, ClockCircleOutlined, CheckCircleOutlined, ReloadOutlined, ReadOutlined, MenuOutlined } from '@ant-design/icons'
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
  const { t } = useTranslation()
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/login/success" element={<LoginSuccessPage />} />
    <Route path="/forbidden" element={<SimplePage title={t("Không có quyền truy cập")} />} />
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
    <Route path="*" element={<SimplePage title={t("Không tìm thấy trang")} />} />
  </Routes>
}

function AppLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { mode } = useAppTheme()
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const screens = Grid.useBreakpoint()
  useEffect(() => { setMobileMenuOpen(false) }, [location.pathname, screens.md])
  const me = useCurrentUser()
  const queryClient = useQueryClient()
  const admin = me.data?.roleCode === 'ADMIN'
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => { queryClient.clear(); navigate('/login') },
  })
  const items = [
    ...(!admin ? [{ key: '/', icon: <HomeOutlined />, label: <Link to="/">{t("Trang chủ")}</Link> }] : []),
    { key: '/explore', icon: <AppstoreOutlined />, label: <Link to="/explore">{t("Khám phá")}</Link> },
    ...(admin ? [
      { key: '/admin', icon: <DashboardOutlined />, label: <Link to="/admin">{t("Tổng quan quản trị")}</Link> },
      { key: '/admin/quizzes', icon: <UnorderedListOutlined />, label: <Link to="/admin/quizzes">{t("Quản lý bộ đề")}</Link> },
      { key: '/admin/quizzes/new', icon: <FileAddOutlined />, label: <Link to="/admin/quizzes/new">{t("Tạo câu hỏi / bộ đề")}</Link> },
      { key: '/admin/categories', icon: <FolderOutlined />, label: <Link to="/admin/categories">{t("Danh mục")}</Link> },
      { key: '/admin/users', icon: <TeamOutlined />, label: <Link to="/admin/users">{t("Người dùng & quyền")}</Link> },
      { key: '/admin/attempts', icon: <SolutionOutlined />, label: <Link to="/admin/attempts">{t("Bài đã nộp")}</Link> },
    ] : []),
  ]
  const selectedKey = items.filter(item => item.key === '/' ? location.pathname === '/' : location.pathname === item.key || location.pathname.startsWith(item.key + '/')).sort((a, b) => b.key.length - a.key.length)[0]?.key
  const mobileItems = admin ? [
    { key: '/admin', icon: <DashboardOutlined />, label: t("Tổng quan") },
    { key: '/admin/quizzes', icon: <UnorderedListOutlined />, label: t("Bộ đề") },
    { key: '/explore', icon: <AppstoreOutlined />, label: t("Khám phá") },
  ] : [
    { key: '/', icon: <HomeOutlined />, label: t("Trang chủ") },
    { key: '/explore', icon: <AppstoreOutlined />, label: t("Khám phá") },
  ]
  return <Layout className="app-shell">
    <Sider collapsible collapsed={collapsed} collapsedWidth={64} breakpoint="lg" onBreakpoint={setCollapsed} onCollapse={setCollapsed} className="app-sider">
      <div className="brand-mark" title="Quizz App"><span className="brand-name">Quizz App</span></div>
      <Menu theme={mode} mode="inline" selectedKeys={selectedKey ? [selectedKey] : []} items={items} />
    </Sider>
    <Layout>
      <Header className="app-header">
        <div className="header-brand"><Link className="mobile-brand" to={admin ? '/admin' : '/'}>Quizz App</Link><Typography.Text className="eyebrow">{location.pathname.startsWith('/admin') ? t("Quản trị") : t("Học tập")}</Typography.Text></div>
        <Space>
          <ThemePicker />
          {me.data ? <><Typography.Text className="account-name">{me.data.displayName ?? me.data.email}</Typography.Text><Tag color={admin ? 'green' : 'blue'}>{me.data.roleCode}</Tag><Button type="text" icon={<LogoutOutlined />} loading={logout.isPending} onClick={() => logout.mutate()}>{t("Đăng xuất")}</Button></> : <Button type="primary" icon={<LoginOutlined />} onClick={() => { rememberLoginDestination(location.pathname + location.search); navigate('/login') }} aria-label={t("Đăng nhập / Đăng ký")}><span className="auth-label">{t("Đăng nhập / Đăng ký")}</span><span className="auth-label-mobile">{t("Đăng nhập")}</span></Button>}
        </Space>
      </Header>
      <Content className="app-content">{logout.isError && <Alert className="mb-24" type="error" showIcon message={t("Chưa đăng xuất được")} description={getErrorMessage(logout.error, t)} />}<Outlet /></Content>
    </Layout>
    <nav className="mobile-nav" aria-label={t("Điều hướng chính")}>
      {mobileItems.map(item => <Link key={item.key} to={item.key} className="mobile-nav-item" aria-current={selectedKey === item.key ? 'page' : undefined}>{item.icon}<span>{item.label}</span></Link>)}
      {admin && <button type="button" className={`mobile-nav-item${selectedKey && !mobileItems.some(item => item.key === selectedKey) ? ' is-active' : ''}`} aria-label={t("Mở menu quản trị")} aria-expanded={mobileMenuOpen} aria-controls="mobile-admin-menu" onClick={() => setMobileMenuOpen(true)}><MenuOutlined /><span>{t("Thêm")}</span></button>}
    </nav>
    <Drawer title={t("Menu quản trị")} placement="bottom" height="auto" className="mobile-menu-drawer" open={mobileMenuOpen && screens.md === false} onClose={() => setMobileMenuOpen(false)}>
      <nav id="mobile-admin-menu" aria-label={t("Các màn quản trị")}><Menu theme={mode} mode="inline" selectedKeys={selectedKey ? [selectedKey] : []} items={items} onClick={() => setMobileMenuOpen(false)} /></nav>
    </Drawer>
  </Layout>
}

function RequireLogin() {
  const { t } = useTranslation()
  const me = useCurrentUser()
  const location = useLocation()
  if (me.isPending) return <Card loading />
  if (me.isError) return <Alert type="error" showIcon message={t("Không kiểm tra được phiên đăng nhập")} description={getErrorMessage(me.error, t)} action={<Button onClick={() => me.refetch()}>{t("Thử lại")}</Button>} />
  if (!me.data) {
    rememberLoginDestination(location.pathname + location.search)
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function AdminGuard() {
  const { t } = useTranslation()
  const me = useCurrentUser()
  const location = useLocation()
  if (me.isPending) return <Card loading />
  if (me.isError) return <Alert type="error" message={t("Không kiểm tra được quyền truy cập")} description={getErrorMessage(me.error, t)} />
  if (!me.data) {
    rememberLoginDestination(location.pathname + location.search)
    return <Navigate to="/login" replace />
  }
  return me.data.roleCode === 'ADMIN' ? <Outlet /> : <Navigate to="/forbidden" replace />
}

function LoginSuccessPage() {
  const { t } = useTranslation()
  const me = useCurrentUser()
  const navigate = useNavigate()
  const completed = useRef(false)
  useEffect(() => {
    if (me.data && !completed.current) {
      completed.current = true
      navigate(loginDestination(me.data.roleCode), { replace: true })
    }
  }, [me.data, navigate])
  if (me.isPending || me.data) return <main className="login-page"><div className="login-theme-picker"><ThemePicker /></div><Card loading className="login-card" /></main>
  return <main className="login-page"><div className="login-theme-picker"><ThemePicker /></div><Card className="login-card"><Alert type="error" showIcon message={t("Chưa xác nhận được phiên đăng nhập")} description={me.isError ? getErrorMessage(me.error, t) : t("Vui lòng mở ứng dụng bằng localhost và đăng nhập lại.")} /><Link to="/login">{t("Về trang đăng nhập")}</Link></Card></main>
}

function LoginPage() {
  const { t } = useTranslation()
  const me = useCurrentUser()
  const config = useQuery({ queryKey: ['auth-config'], queryFn: api.authConfig, retry: false })
  const location = useLocation()
  if (me.data) return <Navigate to={me.data.roleCode === 'ADMIN' ? '/admin' : '/'} replace />
  const googleError = new URLSearchParams(location.search).has('error')
  return <main className="login-page">
    <div className="login-theme-picker"><ThemePicker /></div>
    <Card className="login-card" bordered={false}>
      <Typography.Text className="eyebrow">Quizz App</Typography.Text>
      <Typography.Title>{t("Học có nhịp.")}<br /><span className="accent">{t("Tiến bộ có dấu.")}</span></Typography.Title>
      <Typography.Paragraph type="secondary">{t("Đăng nhập hoặc đăng ký bằng tài khoản Google. Lần đầu đăng nhập, tài khoản học tập của bạn sẽ được tạo tự động.")}</Typography.Paragraph>
      {googleError && <Alert className="mb-24" type="error" showIcon message={t("Đăng nhập Google chưa thành công")} description={t("Bạn có thể thử lại hoặc chọn tài khoản Google khác.")} />}
      {config.isError && <Alert className="mb-24" type="error" showIcon message={t("Chưa kết nối được máy chủ")} description={t("Vui lòng kiểm tra backend và thử lại.")} action={<Button onClick={() => config.refetch()}>{t("Thử lại")}</Button>} />}
      {config.data && !config.data.googleEnabled && <Alert className="mb-24" type="info" showIcon message={t("Đăng nhập Google chưa sẵn sàng")} description={t("Hãy khởi động backend với cấu hình Google OAuth để tiếp tục.")} action={<Button onClick={() => config.refetch()}>{t("Kiểm tra lại")}</Button>} />}
      <Button type="primary" size="large" block icon={<LoginOutlined />} loading={config.isPending} disabled={!config.data?.googleEnabled} onClick={() => { window.location.assign(config.data!.loginUrl) }}>{t("Tiếp tục với Google")}</Button>
      <Typography.Paragraph type="secondary" className="mt-16">{t("Ứng dụng không yêu cầu mật khẩu Gmail của bạn.")}</Typography.Paragraph>
      <Link to="/">{t("← Về trang chủ")}</Link>
    </Card>
  </main>
}

function HomePage({ adminLanding = false }: { adminLanding?: boolean }) {
  const { t } = useTranslation()
  const me = useCurrentUser()
  const navigate = useNavigate()
  if (adminLanding && me.data?.roleCode === 'ADMIN') return <Navigate to="/admin" replace />
  return <section className="explore-page">
    <div className="hero-grid learning-hero">
      <div>
        <Typography.Text className="eyebrow">{t("MỖI NGÀY, THÊM MỘT CHÚT TIẾN BỘ")}</Typography.Text>
        <Typography.Title>{t("Học điều mới.")}<br /><span className="accent">{t("Vững thêm mỗi ngày.")}</span></Typography.Title>
        <Typography.Paragraph type="secondary" className="hero-copy">{t("Biến những phút rảnh thành cơ hội khám phá. Chọn chủ đề bạn yêu thích, thử sức với từng câu hỏi và nhìn thấy tiến bộ qua mỗi lần luyện tập.")}</Typography.Paragraph>
        <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={() => navigate('/explore')}>{t("Khám phá bộ đề")}</Button>
        <Typography.Paragraph type="secondary" className="hero-note">{t("Làm lại thoải mái, học theo nhịp của bạn.")}</Typography.Paragraph>
      </div>
      <div className="learning-steps">
        <div><ReadOutlined /><div><Typography.Text strong>{t("Chọn điều muốn học")}</Typography.Text><p>{t("Khám phá các bộ đề theo chủ đề.")}</p></div></div>
        <div><CheckCircleOutlined /><div><Typography.Text strong>{t("Thử sức từng câu")}</Typography.Text><p>{t("Hoàn thành bài và nhận kết quả ngay.")}</p></div></div>
        <div><ReloadOutlined /><div><Typography.Text strong>{t("Luyện tập, tiến bộ")}</Typography.Text><p>{t("Quay lại bất cứ lúc nào, không giới hạn lượt.")}</p></div></div>
      </div>
    </div>
  </section>
}

function QuizCatalogPage() {
  const { t } = useTranslation()
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories })
  const [categoryId, setCategoryId] = useState<number>()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const quizzes = useQuery({ queryKey: ['public-quizzes', page, search, categoryId], queryFn: () => api.publicQuizzes(page, search, categoryId) })
  return (
    <section id="quiz-catalog" className="quiz-catalog">
      <div className="catalog-heading"><div><Typography.Title level={3}>{t("Hôm nay bạn muốn học gì?")}</Typography.Title><Typography.Text type="secondary">{t("Chọn một bộ đề và bắt đầu hành trình của bạn.")}</Typography.Text></div><Input.Search className="catalog-search" placeholder={t("Tìm tên bộ đề")} aria-label={t("Tìm bộ đề")} allowClear onSearch={value => { setSearch(value.trim()); setPage(0) }} /></div>
      {categories.isError && <Alert className="mb-24" type="error" showIcon message={t("Không tải được danh mục")} action={<Button onClick={() => categories.refetch()}>{t("Thử lại")}</Button>} />}
      <div className="category-chips" aria-label={t("Lọc theo chủ đề")}>
        <Button type={categoryId === undefined ? 'primary' : 'default'} aria-pressed={categoryId === undefined} onClick={() => { setCategoryId(undefined); setPage(0) }}>{t("Tất cả")}</Button>
        {categories.data?.map(category => <Button key={category.id} type={categoryId === category.id ? 'primary' : 'default'} aria-pressed={categoryId === category.id} onClick={() => { setCategoryId(category.id); setPage(0) }}>{category.name}</Button>)}
      </div>
      {quizzes.isPending && <Card loading />}
      {quizzes.isError && <Alert type="error" showIcon message={t("Không tải được bộ đề")} description={getErrorMessage(quizzes.error, t)} action={<Button onClick={() => quizzes.refetch()}>{t("Thử lại")}</Button>} />}
      <div className="public-quiz-grid">{quizzes.data?.content.map(quiz => <Card key={quiz.id} className="public-quiz-card" bordered={false}>
        <Tag>{quiz.categoryName}</Tag>
        <Typography.Title level={4}><Link to={`/quizzes/${quiz.id}`}>{quiz.title}</Link></Typography.Title>
        <div className="public-quiz-meta"><span><ReadOutlined /> {quiz.questionCount}{t(" câu hỏi")}</span><span><ClockCircleOutlined /> {quiz.durationMinutes}{t(" phút")}</span></div>
        <Link className="quiz-card-link" to={`/quizzes/${quiz.id}`}>{t("Khám phá đề ")}<ArrowRightOutlined /></Link>
      </Card>)}</div>
      {quizzes.isSuccess && !quizzes.data.content.length && <Empty description={search || categoryId ? t("Chưa có bộ đề phù hợp. Thử tìm kiếm hoặc chủ đề khác nhé.") : t("Các bộ đề mới đang được chuẩn bị. Hẹn bạn quay lại sớm!")} />}
      {quizzes.data && quizzes.data.totalElements > 12 && <Pagination className="catalog-pagination" current={page + 1} total={quizzes.data.totalElements} pageSize={12} showSizeChanger={false} onChange={value => setPage(value - 1)} />}
    </section>
  )
}

function QuizPage() {
  const { t } = useTranslation()
  const { quizId } = useParams()
  const navigate = useNavigate()
  const id = Number(quizId)
  const quiz = useQuery({ queryKey: ['quiz', id], queryFn: () => api.quiz(id), enabled: Number.isFinite(id) })
  const me = useCurrentUser()
  const start = useMutation({ mutationFn: () => api.startAttempt(id), onSuccess: result => navigate(`/attempts/${result.attemptId}`) })
  if (quiz.isLoading) return <Card loading />
  if (quiz.isError || !quiz.data) return <Alert type="error" showIcon message={t("Không tải được bộ đề")} description={getErrorMessage(quiz.error, t)} />
  return <section className="narrow-page"><Typography.Text className="eyebrow">{quiz.data.categoryCode}</Typography.Text><Typography.Title>{quiz.data.title}</Typography.Title><Typography.Paragraph type="secondary">{quiz.data.description}</Typography.Paragraph><div className="quiz-meta"><Tag>{quiz.data.durationMinutes}{t(" phút")}</Tag><Tag>{quiz.data.questions.length}{t(" câu hỏi")}</Tag></div><Card bordered={false} className="start-card"><Typography.Title level={4}>{t("Sẵn sàng bắt đầu?")}</Typography.Title><Typography.Paragraph type="secondary">{t("Thời gian bắt đầu tính khi bạn vào bài. Nộp bài để xem kết quả; bạn có thể luyện tập lại bao nhiêu lần tùy thích.")}</Typography.Paragraph><Button type="primary" size="large" onClick={() => { if (me.data) start.mutate(); else { rememberLoginDestination(`/quizzes/${id}`); navigate('/login') } }} loading={start.isPending} disabled={me.isPending}>{me.data ? t("Bắt đầu làm bài") : t("Đăng nhập để làm bài")}</Button>{start.isError && <Alert className="mt-16" type="error" message={getErrorMessage(start.error, t)} />}</Card></section>
}

function AttemptPage() {
  const { t } = useTranslation()
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
  if (attempt.isError || !attempt.data) return <Alert type="error" showIcon message={t("Không tải được lượt làm bài")} description={getErrorMessage(attempt.error, t)} />
  const data = attempt.data
  if (data.status !== 'IN_PROGRESS') return <Navigate to={`/attempts/${id}/result`} replace />
  const remaining = Math.max(0, new Date(data.expiresAt).getTime() - now)
  return <section className="attempt-page">
    <div className={`attempt-timer${remaining <= 60000 ? ' is-urgent' : ''}`}><span><ClockCircleOutlined />{t(" Thời gian còn lại")}</span><strong role="timer" aria-label={t("Thời gian làm bài còn lại")} aria-live="off">{formatRemaining(remaining)}</strong></div>
    <div className="attempt-top"><div><Typography.Text className="eyebrow">{t("LƯỢT LÀM BÀI #")}{id}</Typography.Text><Typography.Title level={2}>{definition.data?.title ?? t("Tập trung vào từng câu.")}</Typography.Title></div></div>
    <Alert className="mb-24" type="info" showIcon message={t("Thời gian được quyết định bởi server")} description={t("Tải lại hoặc đóng trang sẽ mất câu trả lời chưa nộp. Thời hạn của lượt làm bài vẫn giữ nguyên.")} />
    {remaining <= 0 && <Alert className="mb-24" type="warning" message={t("Đã hết giờ. Đang kiểm tra trạng thái với server...")} />}
    {definition.isLoading && <Card loading />}
    {definition.isError && <Alert type="error" showIcon message={t("Không tải được câu hỏi")} description={getErrorMessage(definition.error, t)} />}
    <fieldset disabled={submit.isPending || remaining <= 0} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="question-list">{definition.data?.questions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} value={answers[question.id]} onChange={value => setAnswers(current => ({ ...current, [question.id]: value }))} />)}</div>
    </fieldset>
    {submit.isError && <Alert className="mb-24" type="error" showIcon message={t("Chưa nộp được bài")} description={t("{0} Câu trả lời vẫn còn trên trang; bạn có thể thử lại khi còn thời gian.", [getErrorMessage(submit.error, t)])} />}
    <Button className="attempt-submit" type="primary" size="large" loading={submit.isPending} onClick={() => submit.mutate()} disabled={remaining <= 0 || !definition.data}>{t("Nộp bài")}</Button>
  </section>
}

function QuestionCard({ question, index, value, onChange }: { question: Question; index: number; value: Answers[string]; onChange: (value: Answers[string]) => void }) {
  const { t } = useTranslation()
  return <Card bordered={false} className="question-card"><div className="question-heading"><Tag>Q{index + 1}</Tag><Typography.Text type="secondary">{question.points}{t(" điểm")}</Typography.Text></div><Typography.Title level={4}>{question.prompt}</Typography.Title><QuestionInput question={question} value={value} onChange={onChange} /></Card>
}

function QuestionInput({ question, value, onChange }: { question: Question; value: Answers[string]; onChange: (value: Answers[string]) => void }) {
  const { t } = useTranslation()
  if (question.type === 'short_answer') return <input className="answer-input" value={typeof value === 'string' ? value : ''} onChange={event => onChange(event.target.value)} placeholder={t("Nhập câu trả lời...")} />
  if (question.type === 'matching') { const pairs = isMatchingPairs(value) ? value : []; return <div className="matching-list">{question.left.map(left => <label key={left.id} className="matching-row"><span>{left.text}</span><select value={pairs.find(pair => pair.leftId === left.id)?.rightId ?? ''} onChange={event => { const next = pairs.filter(pair => pair.leftId !== left.id); onChange([...next, { leftId: left.id, rightId: event.target.value }]) }}><option value="">{t("Chọn...")}</option>{question.right.map(right => <option key={right.id} value={right.id}>{right.text}</option>)}</select></label>)}</div> }
  if (question.type === 'multiple_choice') { const selected = isStringArray(value) ? value : []; return <div className="option-list">{question.options.map(option => <label key={option.id} className="option-row"><input type="checkbox" checked={selected.includes(option.id)} onChange={event => { const current = selected; onChange(event.target.checked ? [...current, option.id] : current.filter(id => id !== option.id)) }} />{option.text}</label>)}</div> }
  if (question.type === 'dropdown') return <select className="answer-select" value={typeof value === 'string' ? value : ''} onChange={event => onChange(event.target.value)}><option value="">{t("Chọn một đáp án...")}</option>{question.options.map(option => <option key={option.id} value={option.id}>{option.text}</option>)}</select>
  return <div className="option-list">{question.options.map(option => <label key={option.id} className="option-row"><input type="radio" name={question.id} checked={value === option.id} onChange={() => onChange(option.id)} />{option.text}</label>)}</div>
}

function SimplePage({ title }: { title: string }) {
  const { t } = useTranslation()
  return <section className="narrow-page"><div className="standalone-appearance"><ThemePicker /></div><Card bordered={false}><Typography.Title>{title}</Typography.Title><Link to="/">{t("Về trang chủ")}</Link></Card></section> }
function getErrorMessage(error: unknown, t: Translator) { return error instanceof ApiError || error instanceof Error ? t(error.message) : t("Có lỗi không xác định.") }
function formatRemaining(milliseconds: number) { const seconds = Math.floor(milliseconds / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }
function isStringArray(value: Answers[string]): value is string[] { return Array.isArray(value) && value.every(item => typeof item === 'string') }
function isMatchingPairs(value: Answers[string]): value is { leftId: string; rightId: string }[] { return Array.isArray(value) && value.every(item => typeof item === 'object' && item !== null && 'leftId' in item && 'rightId' in item) }



export default App
