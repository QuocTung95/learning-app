package com.tungnq23.quiz_api.attempt;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import com.tungnq23.quiz_api.security.CurrentAppUser;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/attempts")
public class RetakeAdminController {

    private final AttemptService attemptService;
    private final CurrentAppUser currentUser;

    public RetakeAdminController(AttemptService attemptService, CurrentAppUser currentUser) {
        this.attemptService = attemptService;
        this.currentUser = currentUser;
    }

    @PostMapping("/{attemptId}/retake-grants")
    public Long grant(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal OidcUser principal) {
        return attemptService.grantRetake(attemptId, currentUser.adminId(principal));
    }

    @GetMapping("/quiz/{quizId}/results")
    public java.util.List<AttemptResultResponse> results(
            @PathVariable Long quizId,
            @AuthenticationPrincipal OidcUser principal) {
        return attemptService.getAdminResults(quizId, currentUser.adminId(principal));
    }
}
