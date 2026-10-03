package com.tungnq23.quiz_api.attempt;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "retake_grant")
public class RetakeGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_attempt_id", nullable = false)
    private Long sourceAttemptId;

    @Column(name = "granted_by_user_id", nullable = false)
    private Long grantedByUserId;

    @Column(name = "granted_at", nullable = false)
    private OffsetDateTime grantedAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    protected RetakeGrant() {
    }

    public RetakeGrant(Long sourceAttemptId, Long grantedByUserId) {
        this.sourceAttemptId = sourceAttemptId;
        this.grantedByUserId = grantedByUserId;
        this.grantedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public Long getSourceAttemptId() { return sourceAttemptId; }
    public OffsetDateTime getRevokedAt() { return revokedAt; }
}
