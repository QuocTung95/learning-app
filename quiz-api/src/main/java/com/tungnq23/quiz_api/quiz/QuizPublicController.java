package com.tungnq23.quiz_api.quiz;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
