package com.tungnq23.quiz_api.attempt;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import com.tungnq23.quiz_api.security.CurrentAppUser;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AttemptController {

    private final AttemptService attemptService;
    private final CurrentAppUser currentUser;

    public AttemptController(AttemptService attemptService, CurrentAppUser currentUser) {
        this.attemptService = attemptService;
        this.currentUser = currentUser;
    }

    @PostMapping("/quizzes/{quizId}/attempts")
    public AttemptResponse start(
            @PathVariable Long quizId,
            @AuthenticationPrincipal OidcUser principal) {
        return attemptService.start(quizId, currentUser.id(principal));
    }

    @PostMapping("/retake-grants/{grantId}/attempts")
    public AttemptResponse startRetake(
            @PathVariable Long grantId,
            @AuthenticationPrincipal OidcUser principal) {
        return attemptService.startRetake(grantId, currentUser.id(principal));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public AttemptResponse submit(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal OidcUser principal,
            @RequestBody String rawAnswers) {
        return attemptService.submit(attemptId, currentUser.id(principal), rawAnswers);
    }

    @GetMapping("/attempts/{attemptId}")
    public AttemptResultResponse result(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal OidcUser principal) {
        return attemptService.getResult(attemptId, currentUser.id(principal));
    }

    @GetMapping("/attempts/{attemptId}/definition")
    public tools.jackson.databind.JsonNode definition(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal OidcUser principal) {
        return attemptService.getDefinition(attemptId, currentUser.id(principal));
    }
}
