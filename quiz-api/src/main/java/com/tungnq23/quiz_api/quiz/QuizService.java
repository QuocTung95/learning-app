package com.tungnq23.quiz_api.quiz;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import com.tungnq23.quiz_api.admin.AdminPage;

import com.tungnq23.quiz_api.category.Category;
import com.tungnq23.quiz_api.category.CategoryRepository;
import com.tungnq23.quiz_api.definition.QuizDefinitionValidator;
import com.tungnq23.quiz_api.definition.ValidationError;
import com.tungnq23.quiz_api.user.AppUser;
import com.tungnq23.quiz_api.user.AppUserRepository;

import tools.jackson.databind.JsonNode;
import com.tungnq23.quiz_api.definition.PublicQuizDefinition;
import tools.jackson.databind.json.JsonMapper;

@Service
public class QuizService {

    private final CategoryRepository categoryRepository;
    private final AppUserRepository appUserRepository;
    private final QuizRepository quizRepository;
    private final QuizVersionRepository quizVersionRepository;
    private final QuizDefinitionValidator validator;
    private final JsonMapper jsonMapper;

    public QuizService(CategoryRepository categoryRepository,
            AppUserRepository appUserRepository,
            QuizRepository quizRepository,
            QuizVersionRepository quizVersionRepository,
            QuizDefinitionValidator validator,
            JsonMapper jsonMapper) {
        this.categoryRepository = categoryRepository;
        this.appUserRepository = appUserRepository;
        this.quizRepository = quizRepository;
        this.quizVersionRepository = quizVersionRepository;
        this.validator = validator;
        this.jsonMapper = jsonMapper;
    }

    @Transactional
    public CreateQuizResponse create(String rawJson, Long creatorId) {
        if (creatorId == null) {
            throw new QuizCreationException("Authenticated creator is required");
        }

        var errors = validator.validate(rawJson);
        if (!errors.isEmpty()) {
            ValidationError first = errors.get(0);
            throw new QuizCreationException(
                    "Invalid quiz definition at " + first.path() + ": " + first.message()
            );
        }

        JsonNode root = readJson(rawJson);
        String categoryCode = root.get("categoryCode").stringValue().trim().toUpperCase();
        String title = root.get("title").stringValue().trim();
        int schemaVersion = root.get("schemaVersion").intValue();
        int durationMinutes = root.get("durationMinutes").intValue();

        Category category = categoryRepository.findByCode(categoryCode)
                .orElseThrow(() -> new QuizCreationException(
                        "Category not found: " + categoryCode));
        AppUser creator = appUserRepository.findById(creatorId)
                .orElseThrow(() -> new QuizCreationException(
                        "User not found: " + creatorId));
        if (!"ADMIN".equals(creator.getRoleCode())) {
            throw new QuizCreationException("Only an ADMIN can create a quiz");
        }

        Quiz quiz = quizRepository.save(new Quiz(category, creator, title));
        QuizVersion version = quizVersionRepository.save(
                new QuizVersion(quiz, schemaVersion, durationMinutes, rawJson)
        );
        return new CreateQuizResponse(
                quiz.getId(), version.getId(), quiz.getStatus().name()
        );
    }

    @Transactional
    public CreateQuizResponse publish(Long quizId, Long userId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new QuizCreationException("Quiz not found: " + quizId));
        if (!appUserRepository.findById(userId).map(user -> "ADMIN".equals(user.getRoleCode())).orElse(false)) {
            throw new QuizCreationException("Only an ADMIN can publish a quiz");
        }
        QuizVersion version = quizVersionRepository
                .findByQuizIdAndStatus(quizId, QuizVersionStatus.DRAFT)
                .orElseThrow(() -> new QuizCreationException(
                        "No draft version found for quiz: " + quizId));
        version.activate();
        quiz.activate();
        return new CreateQuizResponse(quiz.getId(), version.getId(), quiz.getStatus().name());
    }

    @Transactional(readOnly = true)
    public JsonNode getPublicDefinition(Long quizId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new QuizCreationException("Quiz not found: " + quizId));
        if (quiz.getStatus() != QuizStatus.ACTIVE) {
            throw new QuizCreationException("Quiz is not active: " + quizId);
        }
        QuizVersion version = quizVersionRepository
                .findByQuizIdAndStatus(quizId, QuizVersionStatus.ACTIVE)
                .orElseThrow(() -> new QuizCreationException(
                        "No active version found for quiz: " + quizId));
        return PublicQuizDefinition.from(readJson(version.getContentJson()));
    }

    private JsonNode readJson(String rawJson) {
        try {
            return jsonMapper.readTree(rawJson);
        } catch (Exception exception) {
            throw new QuizCreationException("Quiz JSON cannot be parsed");
        }
    }

    @Transactional(readOnly = true)
    public AdminPage<AdminQuizResponse> listForAdmin(int page, QuizStatus status, String search, Long categoryId) {
        return AdminPage.from(quizRepository.search(status, com.tungnq23.quiz_api.admin.AdminSearch.pattern(search), categoryId,
                PageRequest.of(Math.max(0, page), 20, Sort.by("id").descending()))
                .map(quiz -> new AdminQuizResponse(quiz.getId(), quiz.getTitle(), quiz.getCategory().getName(),
                        quiz.getCategory().getCode(), quiz.getStatus().name(), quiz.getCreatedBy().getEmail())));
    }

    @Transactional(readOnly = true)
    public JsonNode getAdminDefinition(Long quizId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new QuizCreationException("Quiz not found: " + quizId));
        QuizVersionStatus status = quiz.getStatus() == QuizStatus.DRAFT ? QuizVersionStatus.DRAFT : QuizVersionStatus.ACTIVE;
        QuizVersion version = quizVersionRepository.findByQuizIdAndStatus(quizId, status)
                .orElseThrow(() -> new QuizCreationException("Quiz version not found"));
        return readJson(version.getContentJson());
    }

    public record AdminQuizResponse(Long id, String title, String categoryName, String categoryCode, String status, String createdBy) {}
}
