package com.tungnq23.quiz_api.security;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tungnq23.quiz_api.user.AppUser;

@RestController
@RequestMapping("/api")
public class CurrentUserController {

    private final CurrentAppUser currentUser;

    public CurrentUserController(CurrentAppUser currentUser) {
        this.currentUser = currentUser;
    }

    @GetMapping("/me")
    public CurrentUserResponse currentUser(@AuthenticationPrincipal OidcUser oidcUser) {
        AppUser user = currentUser.require(oidcUser);
        return new CurrentUserResponse(
                user.getId(), user.getEmail(), user.getDisplayName(), user.getRoleCode()
        );
    }
}
