package com.tungnq23.quiz_api.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.tungnq23.quiz_api.user.AppUser;
import com.tungnq23.quiz_api.user.AppUserRepository;

@Service
public class CurrentAppUser {
    private final AppUserRepository users;

    public CurrentAppUser(AppUserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public AppUser require(OidcUser principal) {
        if (principal == null || principal.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required");
        }
        return users.findByGoogleSubject(principal.getSubject())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Application user not found"));
    }

    public Long id(OidcUser principal) {
        return require(principal).getId();
    }

    public boolean isAdmin(OidcUser principal) {
        if (principal == null) return false;
        return users.findByGoogleSubject(principal.getSubject())
                .map(user -> "ADMIN".equals(user.getRoleCode())).orElse(false);
    }

    public Long adminId(OidcUser principal) {
        AppUser user = require(principal);
        if (!"ADMIN".equals(user.getRoleCode())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        return user.getId();
    }
}
