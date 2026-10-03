package com.tungnq23.quiz_api.quiz;

import java.time.OffsetDateTime;

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
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "quiz_version", uniqueConstraints = @UniqueConstraint(
        name = "uq_qv_number", columnNames = {"quiz_id", "version_no"}
))
public class QuizVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @Column(name = "version_no", nullable = false)
    private Integer versionNo;

    @Column(name = "schema_version", nullable = false)
    private Integer schemaVersion;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "content_json", nullable = false, columnDefinition = "CLOB")
    private String contentJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private QuizVersionStatus status;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    protected QuizVersion() {
    }

    public QuizVersion(Quiz quiz, Integer schemaVersion, Integer durationMinutes,
            String contentJson) {
        this.quiz = quiz;
        this.versionNo = 1;
        this.schemaVersion = schemaVersion;
        this.durationMinutes = durationMinutes;
        this.contentJson = contentJson;
        this.status = QuizVersionStatus.DRAFT;
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Quiz getQuiz() {
        return quiz;
    }

    public Integer getVersionNo() {
        return versionNo;
    }

    public Integer getSchemaVersion() {
        return schemaVersion;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public String getContentJson() {
        return contentJson;
    }

    public QuizVersionStatus getStatus() {
        return status;
    }

    public OffsetDateTime getPublishedAt() {
        return publishedAt;
    }

    public void activate() {
        this.status = QuizVersionStatus.ACTIVE;
        this.publishedAt = OffsetDateTime.now();
    }
}
