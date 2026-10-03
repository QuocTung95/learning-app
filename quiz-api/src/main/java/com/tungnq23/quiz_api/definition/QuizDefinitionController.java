package com.tungnq23.quiz_api.definition;

import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import com.tungnq23.quiz_api.security.CurrentAppUser;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/quiz-definitions")
public class QuizDefinitionController {

    private final QuizDefinitionValidator validator;
    private final CurrentAppUser currentUser;

    public QuizDefinitionController(QuizDefinitionValidator validator, CurrentAppUser currentUser) {
        this.validator = validator;
        this.currentUser = currentUser;
    }

    @PostMapping("/validate")
    public List<ValidationError> validate(@RequestBody String rawJson, @AuthenticationPrincipal OidcUser principal) {
        currentUser.adminId(principal);
        return validator.validate(rawJson);
    }
}
