package com.tungnq23.quiz_api.attempt;

import java.math.BigDecimal;

public record AttemptAnswerResponse(
        String questionId,
        String responseJson,
        BigDecimal pointsAwarded
) {
}
