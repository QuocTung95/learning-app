package com.tungnq23.quiz_api.attempt;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "attempt_answer", uniqueConstraints = @UniqueConstraint(
        name = "uq_aa_question", columnNames = {"attempt_id", "question_id"}
))
public class AttemptAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_id", nullable = false)
    private Attempt attempt;

    @Column(name = "question_id", nullable = false, length = 80)
    private String questionId;

    @Column(name = "response_json", nullable = false, columnDefinition = "CLOB")
    private String responseJson;

    @Column(name = "points_awarded", nullable = false, precision = 10, scale = 2)
    private BigDecimal pointsAwarded;

    protected AttemptAnswer() {
    }

    public AttemptAnswer(Attempt attempt, String questionId, String responseJson,
            BigDecimal pointsAwarded) {
        this.attempt = attempt;
        this.questionId = questionId;
        this.responseJson = responseJson;
        this.pointsAwarded = pointsAwarded;
    }

    public String getQuestionId() { return questionId; }
    public String getResponseJson() { return responseJson; }
    public BigDecimal getPointsAwarded() { return pointsAwarded; }
}
