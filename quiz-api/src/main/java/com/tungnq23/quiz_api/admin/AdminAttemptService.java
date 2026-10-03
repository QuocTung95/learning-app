package com.tungnq23.quiz_api.admin;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import jakarta.persistence.criteria.Predicate;
import com.tungnq23.quiz_api.attempt.*;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class AdminAttemptService {
    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final AttemptRepository attempts;
    private final AttemptAnswerRepository answers;
    private final JsonMapper json;

    public AdminAttemptService(AttemptRepository attempts, AttemptAnswerRepository answers, JsonMapper json) {
        this.attempts = attempts;
        this.answers = answers;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public AdminPage<Summary> list(int page, int size, Long categoryId, Long quizId, String userSearch,
            LocalDate from, LocalDate to, BigDecimal minPercent, BigDecimal maxPercent,
            SubmissionMethod method, Boolean retake, Order order) {
        if (page < 0 || size < 1 || size > 100 || (from != null && to != null && from.isAfter(to))
                || invalidPercent(minPercent) || invalidPercent(maxPercent)
                || (minPercent != null && maxPercent != null && minPercent.compareTo(maxPercent) > 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid filters or date range");
        }
        OffsetDateTime start = from == null ? null : from.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        OffsetDateTime end = to == null ? null : to.plusDays(1).atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        Specification<Attempt> specification = (root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            filters.add(cb.equal(root.get("status"), AttemptStatus.SUBMITTED));
            if (categoryId != null) filters.add(cb.equal(root.get("quiz").get("category").get("id"), categoryId));
            if (quizId != null) filters.add(cb.equal(root.get("quiz").get("id"), quizId));
            if (!userSearch.isBlank()) {
                String pattern = AdminSearch.pattern(userSearch).toLowerCase(java.util.Locale.ROOT);
                filters.add(cb.or(cb.like(cb.lower(root.get("user").get("email")), pattern, '!'),
                        cb.like(cb.lower(root.get("user").get("displayName")), pattern, '!')));
            }
            if (start != null) filters.add(cb.greaterThanOrEqualTo(root.get("submittedAt"), start));
            if (end != null) filters.add(cb.lessThan(root.get("submittedAt"), end));
            if (method != null) filters.add(cb.equal(root.get("submissionMethod"), method));
            if (retake != null) filters.add(retake ? cb.isNotNull(root.get("retakeGrantId")) : cb.isNull(root.get("retakeGrantId")));
            if (minPercent != null) filters.add(cb.ge(cb.prod(root.<BigDecimal>get("totalScore"), 100), cb.prod(root.<BigDecimal>get("maxScore"), minPercent)));
            if (maxPercent != null) filters.add(cb.le(cb.prod(root.<BigDecimal>get("totalScore"), 100), cb.prod(root.<BigDecimal>get("maxScore"), maxPercent)));
            if (query != null && query.getResultType() != Long.class) {
                var primary = switch (order) {
                    case OLDEST -> cb.asc(root.get("submittedAt"));
                    case SCORE_HIGH -> cb.desc(cb.quot(root.<BigDecimal>get("totalScore"), cb.nullif(root.<BigDecimal>get("maxScore"), BigDecimal.ZERO)));
                    case SCORE_LOW -> cb.asc(cb.quot(root.<BigDecimal>get("totalScore"), cb.nullif(root.<BigDecimal>get("maxScore"), BigDecimal.ZERO)));
                    default -> cb.desc(root.get("submittedAt"));
                };
                query.orderBy(primary, cb.desc(root.get("id")));
            }
            return cb.and(filters.toArray(Predicate[]::new));
        };
        return AdminPage.from(attempts.findAll(specification, PageRequest.of(page, size)).map(this::summary));
    }

    @Transactional(readOnly = true)
    public Detail detail(Long id) {
        Attempt attempt = attempts.findById(id)
                .filter(item -> item.getStatus() == AttemptStatus.SUBMITTED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submitted attempt not found"));
        JsonNode definition = json.readTree(attempt.getQuizVersion().getContentJson());
        List<AttemptAnswerResponse> responses = answers.findAllByAttemptIdOrderByIdAsc(id).stream()
                .map(answer -> new AttemptAnswerResponse(answer.getQuestionId(), answer.getResponseJson(), answer.getPointsAwarded())).toList();
        return new Detail(summary(attempt), definition, responses);
    }

    private boolean invalidPercent(BigDecimal value) {
        return value != null && (value.compareTo(BigDecimal.ZERO) < 0 || value.compareTo(BigDecimal.valueOf(100)) > 0);
    }

    private Summary summary(Attempt attempt) {
        BigDecimal percent = attempt.getTotalScore() == null || attempt.getMaxScore().signum() == 0 ? null
                : attempt.getTotalScore().multiply(BigDecimal.valueOf(100)).divide(attempt.getMaxScore(), 1, RoundingMode.HALF_UP);
        return new Summary(attempt.getId(), attempt.getUser().getId(), attempt.getUser().getEmail(), attempt.getUser().getDisplayName(),
                attempt.getQuiz().getId(), attempt.getQuiz().getTitle(), attempt.getQuiz().getCategory().getId(),
                attempt.getQuiz().getCategory().getName(), attempt.getQuizVersion().getId(), attempt.getStartedAt(),
                attempt.getSubmittedAt(), attempt.getTotalScore(), attempt.getMaxScore(), percent,
                attempt.getSubmissionMethod(), attempt.getRetakeGrantId() != null);
    }

    public enum Order { NEWEST, OLDEST, SCORE_HIGH, SCORE_LOW }
    public record Summary(Long attemptId, Long userId, String email, String displayName, Long quizId, String quizTitle,
            Long categoryId, String categoryName, Long quizVersionId, OffsetDateTime startedAt, OffsetDateTime submittedAt,
            BigDecimal totalScore, BigDecimal maxScore, BigDecimal percent, SubmissionMethod submissionMethod, boolean retake) {}
    public record Detail(Summary summary, JsonNode definition, List<AttemptAnswerResponse> answers) {}
}
