package com.tungnq23.quiz_api.attempt;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record AttemptResultResponse(
        Long attemptId,
        Long quizId,
        Long quizVersionId,
        AttemptStatus status,
        OffsetDateTime startedAt,
        OffsetDateTime expiresAt,
        OffsetDateTime submittedAt,
        BigDecimal totalScore,
        BigDecimal maxScore,
        List<AttemptAnswerResponse> answers
) {
}
