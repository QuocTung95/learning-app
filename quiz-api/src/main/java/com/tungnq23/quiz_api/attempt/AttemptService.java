package com.tungnq23.quiz_api.attempt;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tungnq23.quiz_api.quiz.Quiz;
import com.tungnq23.quiz_api.quiz.QuizRepository;
import com.tungnq23.quiz_api.quiz.QuizStatus;
import com.tungnq23.quiz_api.quiz.QuizVersion;
import com.tungnq23.quiz_api.quiz.QuizVersionStatus;
import com.tungnq23.quiz_api.quiz.QuizVersionRepository;
import com.tungnq23.quiz_api.user.AppUser;
import com.tungnq23.quiz_api.user.AppUserRepository;
import com.tungnq23.quiz_api.definition.PublicQuizDefinition;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class AttemptService {

    private final AttemptRepository attemptRepository;
    private final AttemptAnswerRepository answerRepository;
    private final QuizRepository quizRepository;
    private final QuizVersionRepository versionRepository;
    private final AppUserRepository userRepository;
    private final RetakeGrantRepository retakeGrantRepository;
    private final JsonMapper jsonMapper;

    public AttemptService(AttemptRepository attemptRepository,
            AttemptAnswerRepository answerRepository,
            QuizRepository quizRepository,
            QuizVersionRepository versionRepository,
            AppUserRepository userRepository,
            RetakeGrantRepository retakeGrantRepository,
            JsonMapper jsonMapper) {
        this.attemptRepository = attemptRepository;
        this.answerRepository = answerRepository;
        this.quizRepository = quizRepository;
        this.versionRepository = versionRepository;
        this.userRepository = userRepository;
        this.retakeGrantRepository = retakeGrantRepository;
        this.jsonMapper = jsonMapper;
    }

    @Transactional
    public AttemptResponse start(Long quizId, Long userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new AttemptException("User not found: " + userId));
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new AttemptException("Quiz not found: " + quizId));
        if (quiz.getStatus() != QuizStatus.ACTIVE) {
            throw new AttemptException("Quiz is not active: " + quizId);
        }
        QuizVersion version = versionRepository.findByQuizIdAndStatus(
                quizId, QuizVersionStatus.ACTIVE
        ).orElseThrow(() -> new AttemptException("Active quiz version not found"));

        JsonNode definition = read(version.getContentJson());
        BigDecimal maxScore = calculateMaxScore(definition);
        OffsetDateTime startedAt = OffsetDateTime.now();
        OffsetDateTime expiresAt = startedAt.plusMinutes(version.getDurationMinutes());
        Attempt attempt = attemptRepository.save(
                new Attempt(user, quiz, version, startedAt, expiresAt, maxScore)
        );
        return toResponse(attempt);
    }

    @Transactional
    public AttemptResponse startRetake(Long grantId, Long userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new AttemptException("User not found: " + userId));
        RetakeGrant grant = retakeGrantRepository.findById(grantId)
                .orElseThrow(() -> new AttemptException("Retake grant not found: " + grantId));
        if (grant.getRevokedAt() != null) {
            throw new AttemptException("Retake grant has been revoked");
        }
        if (attemptRepository.findByRetakeGrantId(grantId).isPresent()) {
            throw new AttemptException("Retake grant has already been used");
        }
        Attempt source = attemptRepository.findById(grant.getSourceAttemptId())
                .orElseThrow(() -> new AttemptException("Source attempt not found"));
        if (!source.getUser().getId().equals(userId)) {
            throw new AttemptException("Retake grant belongs to another user");
        }
        Quiz quiz = source.getQuiz();
        QuizVersion version = source.getQuizVersion();
        JsonNode definition = read(version.getContentJson());
        OffsetDateTime startedAt = OffsetDateTime.now();
        Attempt attempt = attemptRepository.save(new Attempt(
                user, quiz, version, startedAt,
                startedAt.plusMinutes(version.getDurationMinutes()),
                calculateMaxScore(definition), grantId
        ));
        return toResponse(attempt);
    }

    @Transactional
    public Long grantRetake(Long sourceAttemptId, Long adminId) {
        AppUser admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AttemptException("User not found: " + adminId));
        if (!"ADMIN".equals(admin.getRoleCode())) {
            throw new AttemptException("Only an ADMIN can grant a retake");
        }
        Attempt source = attemptRepository.findById(sourceAttemptId)
                .orElseThrow(() -> new AttemptException(
                        "Source attempt not found: " + sourceAttemptId));
        if (source.getStatus() != AttemptStatus.SUBMITTED) {
            throw new AttemptException("Only a submitted attempt can receive a retake grant");
        }
        return retakeGrantRepository.save(
                new RetakeGrant(sourceAttemptId, adminId)
        ).getId();
    }

    @Transactional
    public AttemptResponse submit(Long attemptId, Long userId, String rawAnswers) {
        Attempt attempt = attemptRepository.findLockedByIdAndUserId(attemptId, userId)
                .orElseThrow(() -> new AttemptException("Attempt not found: " + attemptId));
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new AttemptException("Attempt is no longer in progress");
        }
        if (!OffsetDateTime.now().isBefore(attempt.getExpiresAt())) {
            attempt.expire();
            return toResponse(attemptRepository.save(attempt));
        }

        JsonNode answers = read(rawAnswers);
        if (!answers.isObject()) {
            throw new AttemptException("Answers must be a JSON object");
        }
        JsonNode definition = read(attempt.getQuizVersion().getContentJson());
        JsonNode questions = definition.get("questions");
        BigDecimal total = BigDecimal.ZERO;
        Set<String> submittedIds = new HashSet<>();
        for (JsonNode question : questions) {
            String questionId = question.get("id").stringValue();
            JsonNode response = answers.get(questionId);
            BigDecimal awarded = score(question, response);
            total = total.add(awarded);
            if (response != null) {
                submittedIds.add(questionId);
                answerRepository.save(new AttemptAnswer(
                        attempt, questionId, response.toString(), awarded
                ));
            }
        }
        for (String questionId : answers.propertyNames()) {
            if (!submittedIds.contains(questionId)) {
                throw new AttemptException("Unknown question ID: " + questionId);
            }
        }
        attempt.submit(SubmissionMethod.USER, total, OffsetDateTime.now());
        return toResponse(attemptRepository.save(attempt));
    }

    @Transactional
    public AttemptResultResponse getResult(Long attemptId, Long userId) {
        Attempt attempt = attemptRepository.findLockedByIdAndUserId(attemptId, userId)
                .orElseThrow(() -> new AttemptException("Attempt not found: " + attemptId));
        if (attempt.getStatus() == AttemptStatus.IN_PROGRESS
                && !OffsetDateTime.now().isBefore(attempt.getExpiresAt())) {
            attempt.expire();
        }
        return toResult(attempt);
    }

    private AttemptResultResponse toResult(Attempt attempt) {
        List<AttemptAnswerResponse> answers = answerRepository
                .findAllByAttemptIdOrderByIdAsc(attempt.getId())
                .stream()
                .map(answer -> new AttemptAnswerResponse(
                        answer.getQuestionId(), answer.getResponseJson(), answer.getPointsAwarded()
                ))
                .toList();
        return new AttemptResultResponse(
                attempt.getId(), attempt.getQuiz().getId(), attempt.getQuizVersion().getId(),
                attempt.getStatus(), attempt.getStartedAt(), attempt.getExpiresAt(),
                attempt.getSubmittedAt(), attempt.getTotalScore(), attempt.getMaxScore(), answers
        );
    }

    @Transactional(readOnly = true)
    public JsonNode getDefinition(Long attemptId, Long userId) {
        Attempt attempt = attemptRepository.findByIdAndUserId(attemptId, userId)
                .orElseThrow(() -> new AttemptException("Attempt not found: " + attemptId));
        return PublicQuizDefinition.from(read(attempt.getQuizVersion().getContentJson()));
    }

    @Transactional(readOnly = true)
    public List<AttemptResultResponse> getAdminResults(Long quizId, Long adminId) {
        AppUser admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AttemptException("User not found: " + adminId));
        if (!"ADMIN".equals(admin.getRoleCode())) {
            throw new AttemptException("Only an ADMIN can view quiz results");
        }
        return attemptRepository.findAllByQuizIdOrderByStartedAtDesc(quizId)
                .stream()
                .map(this::toResult)
                .toList();
    }

    private BigDecimal calculateMaxScore(JsonNode definition) {
        BigDecimal total = BigDecimal.ZERO;
        for (JsonNode question : definition.get("questions")) {
            total = total.add(BigDecimal.valueOf(question.get("points").intValue()));
        }
        return total;
    }

    private BigDecimal score(JsonNode question, JsonNode response) {
        if (response == null) {
            return BigDecimal.ZERO;
        }
        int points = question.get("points").intValue();
        String type = question.get("type").stringValue();
        if ("matching".equals(type)) {
            return BigDecimal.valueOf(matchingScore(response, question.get("correctPairs")));
        }
        boolean correct = switch (type) {
            case "single_choice", "dropdown" -> response.isTextual()
                    && response.stringValue().equals(question.get("correctOptionId").stringValue());
            case "multiple_choice" -> sameStringSet(response, question.get("correctOptionIds"));
            case "short_answer" -> acceptedAnswer(response, question.get("acceptedAnswers"));
            default -> false;
        };
        return correct ? BigDecimal.valueOf(points) : BigDecimal.ZERO;
    }

    private boolean sameStringSet(JsonNode response, JsonNode expected) {
        if (!response.isArray() || !expected.isArray() || response.size() != expected.size()) {
            return false;
        }
        Set<String> actual = new HashSet<>();
        Set<String> required = new HashSet<>();
        response.forEach(value -> actual.add(value.stringValue()));
        expected.forEach(value -> required.add(value.stringValue()));
        return actual.equals(required) && actual.size() == response.size();
    }

    private boolean acceptedAnswer(JsonNode response, JsonNode accepted) {
        if (!response.isTextual() || !accepted.isArray()) {
            return false;
        }
        String actual = normalize(response.stringValue());
        for (JsonNode value : accepted) {
            if (actual.equals(normalize(value.stringValue()))) {
                return true;
            }
        }
        return false;
    }

    private int matchingScore(JsonNode response, JsonNode expected) {
        if (!response.isArray() || !expected.isArray()) {
            return 0;
        }
        Map<String, String> required = new HashMap<>();
        for (JsonNode pair : expected) {
            required.put(pair.get("leftId").stringValue(), pair.get("rightId").stringValue());
        }
        Set<String> seenLeft = new HashSet<>();
        int score = 0;
        for (JsonNode pair : response) {
            if (!pair.isObject() || pair.get("leftId") == null || pair.get("rightId") == null
                    || !pair.get("leftId").isTextual() || !pair.get("rightId").isTextual()) {
                return 0;
            }
            String left = pair.get("leftId").stringValue();
            if (!seenLeft.add(left) || !required.containsKey(left)) {
                return 0;
            }
            if (required.get(left).equals(pair.get("rightId").stringValue())) {
                score++;
            }
        }
        return score;
    }

    private String normalize(String value) {
        return value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private JsonNode read(String rawJson) {
        try {
            return jsonMapper.readTree(rawJson);
        } catch (Exception exception) {
            throw new AttemptException("Invalid JSON");
        }
    }

    private AttemptResponse toResponse(Attempt attempt) {
        return new AttemptResponse(
                attempt.getId(), attempt.getQuiz().getId(), attempt.getExpiresAt(),
                attempt.getStatus(), attempt.getTotalScore(), attempt.getMaxScore()
        );
    }
}
