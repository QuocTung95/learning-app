package com.tungnq23.quiz_api.attempt;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AttemptResponse(
        Long attemptId,
        Long quizId,
        OffsetDateTime expiresAt,
        AttemptStatus status,
        BigDecimal totalScore,
        BigDecimal maxScore
) {
}
