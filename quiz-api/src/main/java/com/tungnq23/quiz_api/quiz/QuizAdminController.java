package com.tungnq23.quiz_api.quiz;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import com.tungnq23.quiz_api.security.CurrentAppUser;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import com.tungnq23.quiz_api.admin.AdminPage;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/admin/quizzes")
public class QuizAdminController {

    private final QuizService quizService;
    private final CurrentAppUser currentUser;

    public QuizAdminController(QuizService quizService, CurrentAppUser currentUser) {
        this.quizService = quizService;
        this.currentUser = currentUser;
    }

    @PostMapping
    public ResponseEntity<CreateQuizResponse> create(
            @AuthenticationPrincipal OidcUser principal,
            @RequestBody String rawJson) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(quizService.create(rawJson, currentUser.adminId(principal)));
    }

    @GetMapping
    public AdminPage<QuizService.AdminQuizResponse> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) QuizStatus status, @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) Long categoryId) {
        return quizService.listForAdmin(page, status, q, categoryId);
    }

    @GetMapping("/{quizId}/definition")
    public JsonNode definition(@PathVariable Long quizId) {
        return quizService.getAdminDefinition(quizId);
    }

    @PostMapping("/{quizId}/publish")
    public CreateQuizResponse publish(
            @AuthenticationPrincipal OidcUser principal,
            @org.springframework.web.bind.annotation.PathVariable Long quizId) {
        return quizService.publish(quizId, currentUser.adminId(principal));
    }
}
