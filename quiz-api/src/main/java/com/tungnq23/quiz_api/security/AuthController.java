package com.tungnq23.quiz_api.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final boolean enabled;

    public AuthController(@Value("${app.oauth2.enabled:false}") boolean enabled) {
        this.enabled = enabled;
    }

    @GetMapping("/config")
    public AuthConfig config() {
        return new AuthConfig(enabled, "/oauth2/authorization/google");
    }

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return token == null ? new CsrfResponse(null, null)
                : new CsrfResponse(token.getHeaderName(), token.getToken());
    }

    public record AuthConfig(boolean googleEnabled, String loginUrl) {}
    public record CsrfResponse(String headerName, String token) {}
}
