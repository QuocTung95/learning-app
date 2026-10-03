import { Alert, Button, Card, Progress, Tag, Typography } from 'antd'
import { CheckCircleFilled, CloseCircleFilled, MinusCircleFilled, ExclamationCircleFilled, TrophyOutlined, ReloadOutlined, ArrowRightOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from './api/client'
import { questionResults, type ResultState } from './resultPresentation'

const states = {
  correct: { label: 'Đúng', icon: <CheckCircleFilled /> },
  partial: { label: 'Đúng một phần', icon: <ExclamationCircleFilled /> },
  incorrect: { label: 'Sai', icon: <CloseCircleFilled /> },
  unanswered: { label: 'Chưa trả lời', icon: <MinusCircleFilled /> },
} satisfies Record<ResultState, { label: string; icon: React.ReactNode }>

const questionTypes = { single_choice: 'Chọn một đáp án', multiple_choice: 'Chọn nhiều đáp án', dropdown: 'Chọn đáp án', short_answer: 'Trả lời ngắn', matching: 'Ghép cặp' }
const scoreText = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)

export default function ResultPage() {
  const { attemptId } = useParams()
  const id = Number(attemptId)
  const navigate = useNavigate()
  const result = useQuery({ queryKey: ['attempt', id], queryFn: () => api.attemptResult(id), enabled: Number.isSafeInteger(id) && id > 0 })
  const definition = useQuery({ queryKey: ['attempt-definition', id], queryFn: () => api.attemptDefinition(id), enabled: Boolean(result.data && result.data.status !== 'IN_PROGRESS') })
  if (result.isLoading) return <Card loading />
  if (result.isError || !result.data) return <Alert type="error" showIcon message="Không tải được kết quả" description={result.error instanceof Error ? result.error.message : 'Vui lòng thử lại.'} action={<Button onClick={() => result.refetch()}>Thử lại</Button>} />
  const data = result.data
  if (data.status === 'IN_PROGRESS') return <Navigate to={`/attempts/${id}`} replace />
  const submitted = data.status === 'SUBMITTED'
  const score = data.totalScore ?? 0
  const percent = data.maxScore > 0 ? Math.max(0, Math.min(100, Math.round(score / data.maxScore * 100))) : 0
  const rows = submitted && definition.data ? questionResults(definition.data.questions, data.answers) : []
  const counts = rows.reduce((acc, row) => { acc[row.state]++; return acc }, { correct: 0, partial: 0, incorrect: 0, unanswered: 0 })
  const seconds = data.submittedAt ? Math.max(0, Math.round((new Date(data.submittedAt).getTime() - new Date(data.startedAt).getTime()) / 1000)) : null
  return <section className="result-page">
    <div className="result-heading">
      <Typography.Text className="eyebrow">KẾT QUẢ LUYỆN TẬP</Typography.Text>
      <Typography.Title level={2}>{submitted ? 'Mỗi lần thử, thêm một bước tiến.' : 'Lượt làm bài đã hết thời gian.'}</Typography.Title>
      {definition.data && <Typography.Paragraph type="secondary">{definition.data.title}</Typography.Paragraph>}
    </div>
    {submitted ? <div className="result-overview">
      <div className="result-score-panel">
        <div className="result-chart" role="img" aria-label={`Đạt ${scoreText(score)} trên ${scoreText(data.maxScore)} điểm, tương đương ${percent}% tổng điểm`}>
          <Progress type="circle" percent={percent} size={170} strokeWidth={8} strokeColor="var(--accent)" trailColor="var(--border)" format={() => <div className="result-chart-value"><strong>{percent}%</strong><span>Tổng điểm</span></div>} />
        </div>
        <div className="result-score-copy">
          <span className="result-score-label"><TrophyOutlined /> Điểm của bạn</span>
          <div className="result-total-score">{scoreText(score)} <span>/ {scoreText(data.maxScore)}</span></div>
          <Typography.Paragraph type="secondary">{percent === 100 ? 'Tuyệt vời! Bạn đã đạt trọn vẹn số điểm.' : percent >= 80 ? 'Làm tốt lắm! Luyện thêm để vững hơn nhé.' : 'Mỗi câu hỏi là một cơ hội học thêm. Hãy tiếp tục luyện tập nhé.'}</Typography.Paragraph>
          {seconds !== null && <Typography.Text type="secondary" className="result-duration"><ClockCircleOutlined /> {Math.floor(seconds / 60)} phút {seconds % 60} giây</Typography.Text>}
        </div>
      </div>
      {definition.isSuccess && <div className="result-counts">{(Object.keys(states) as ResultState[]).map(state => <div key={state} className={`result-count result-${state}`}><span className="result-state-icon">{states[state].icon}</span><strong>{counts[state]}</strong><span>{states[state].label}</span></div>)}</div>}
    </div> : <Alert className="mb-24" type="warning" showIcon message="Bài chưa được nộp nên chưa có kết quả chấm điểm." description="Bạn có thể bắt đầu một lượt mới để tiếp tục luyện tập." />}
    <div className="result-actions"><Button type="primary" size="large" icon={<ReloadOutlined />} onClick={() => navigate(`/quizzes/${data.quizId}`)}>Luyện tập lại</Button><Button size="large" icon={<ArrowRightOutlined />} onClick={() => navigate('/explore')}>Khám phá bộ đề khác</Button></div>
    {definition.isLoading && <Card loading />}
    {definition.isError && <Alert className="mb-24" type="error" showIcon message="Chưa tải được chi tiết từng câu" description="Điểm tổng vẫn được giữ. Vui lòng thử tải lại chi tiết." action={<Button onClick={() => definition.refetch()}>Thử lại</Button>} />}
    {submitted && definition.data && <>
      <div className="result-detail-heading"><Typography.Title level={3}>Chi tiết từng câu</Typography.Title><Typography.Text type="secondary">{rows.length} câu hỏi</Typography.Text></div>
      <div className="result-question-list">{rows.map(row => <Card key={row.question.id} bordered={false} className={`result-question result-${row.state}`}>
        <div className="result-question-header"><div className="result-question-title"><Typography.Text strong>Câu {row.number}</Typography.Text><span className="result-question-kind">{questionTypes[row.question.type]}</span></div><div className="result-question-grade"><Tag className="result-state-tag" icon={states[row.state].icon}>{states[row.state].label}</Tag><strong>{scoreText(row.points)} <span>/ {scoreText(row.question.points)} điểm</span></strong></div></div>
        <Typography.Paragraph className="result-prompt">{row.question.prompt}</Typography.Paragraph>
        <div className="result-response"><Typography.Text type="secondary">Câu trả lời của bạn</Typography.Text>{row.state === 'unanswered' ? <p className="result-empty-answer">Bạn chưa trả lời câu này.</p> : <ul>{row.answerLines.map((line, index) => <li key={index}>{line}</li>)}</ul>}</div>
      </Card>)}</div>
    </>}
  </section>
}
