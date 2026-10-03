package com.tungnq23.quiz_api.quiz;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import com.tungnq23.quiz_api.admin.AdminPage;

import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/quizzes")
public class QuizPublicController {

    private final QuizService quizService;

    public QuizPublicController(QuizService quizService) {
        this.quizService = quizService;
    }

    @GetMapping("/{quizId}")
    public JsonNode get(@PathVariable Long quizId) {
        return quizService.getPublicDefinition(quizId);
    }

    @GetMapping
    public AdminPage<QuizService.PublicQuizSummary> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "") String q, @RequestParam(required = false) Long categoryId) {
        return quizService.listPublic(page, q, categoryId);
    }
}
