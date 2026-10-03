package com.tungnq23.quiz_api.attempt;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import com.tungnq23.quiz_api.quiz.Quiz;
import com.tungnq23.quiz_api.quiz.QuizVersion;
import com.tungnq23.quiz_api.user.AppUser;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "attempt")
public class Attempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_version_id", nullable = false,
            insertable = false, updatable = false)
    private QuizVersion quizVersion;

    @Column(name = "quiz_version_id", nullable = false)
    private Long quizVersionId;

    @Column(name = "retake_grant_id")
    private Long retakeGrantId;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private AttemptStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "submission_method", length = 10)
    private SubmissionMethod submissionMethod;

    @Column(name = "total_score", precision = 10, scale = 2)
    private BigDecimal totalScore;

    @Column(name = "max_score", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxScore;

    protected Attempt() {
    }

    public Attempt(AppUser user, Quiz quiz, QuizVersion quizVersion,
            OffsetDateTime startedAt, OffsetDateTime expiresAt, BigDecimal maxScore) {
        this(user, quiz, quizVersion, startedAt, expiresAt, maxScore, null);
    }

    public Attempt(AppUser user, Quiz quiz, QuizVersion quizVersion,
            OffsetDateTime startedAt, OffsetDateTime expiresAt, BigDecimal maxScore,
            Long retakeGrantId) {
        this.user = user;
        this.quiz = quiz;
        this.quizVersion = quizVersion;
        this.quizVersionId = quizVersion.getId();
        this.startedAt = startedAt;
        this.expiresAt = expiresAt;
        this.status = AttemptStatus.IN_PROGRESS;
        this.maxScore = maxScore;
        this.retakeGrantId = retakeGrantId;
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public Quiz getQuiz() { return quiz; }
    public QuizVersion getQuizVersion() { return quizVersion; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public AttemptStatus getStatus() { return status; }
    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public BigDecimal getTotalScore() { return totalScore; }
    public BigDecimal getMaxScore() { return maxScore; }
    public SubmissionMethod getSubmissionMethod() { return submissionMethod; }
    public Long getRetakeGrantId() { return retakeGrantId; }

    public void submit(SubmissionMethod method, BigDecimal score, OffsetDateTime submittedAt) {
        this.status = AttemptStatus.SUBMITTED;
        this.submissionMethod = method;
        this.totalScore = score;
        this.submittedAt = submittedAt;
    }

    public void expire() {
        this.status = AttemptStatus.EXPIRED;
        this.submissionMethod = null;
        this.totalScore = null;
        this.submittedAt = null;
    }
}
