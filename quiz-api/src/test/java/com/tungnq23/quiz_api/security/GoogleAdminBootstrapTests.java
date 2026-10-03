package com.tungnq23.quiz_api.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import com.tungnq23.quiz_api.user.*;

class GoogleAdminBootstrapTests {
    @Test
    void onlyConfiguredVerifiedEmailCanBecomeFirstAdmin() {
        AppUserRepository users = mock(AppUserRepository.class);
        AppUser user = AppUser.fromGoogle("bootstrap", "owner@example.test", "Owner");
        when(users.findByGoogleSubject("bootstrap")).thenReturn(Optional.of(user));
        when(users.countByRoleCode(AppRole.ADMIN)).thenReturn(0L);
        var service = new GoogleOidcUserService(users, " OWNER@example.test ");
        var result = service.provisionGoogleUser(principal("bootstrap", "owner@example.test"));
        assertEquals("ADMIN", user.getRoleCode());
        assertTrue(result.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }

    @Test
    void bootstrapDoesNotPromoteUserOnceAdminExists() {
        AppUserRepository users = mock(AppUserRepository.class);
        AppUser user = AppUser.fromGoogle("existing", "owner@example.test", "Owner");
        when(users.findByGoogleSubject("existing")).thenReturn(Optional.of(user));
        when(users.countByRoleCode(AppRole.ADMIN)).thenReturn(1L);
        new GoogleOidcUserService(users, "owner@example.test")
                .provisionGoogleUser(principal("existing", "owner@example.test"));
        assertEquals("USER", user.getRoleCode());
    }

    @Test
    void otherGoogleAccountsRemainUsers() {
        AppUserRepository users = mock(AppUserRepository.class);
        AppUser user = AppUser.fromGoogle("other", "other@example.test", "Other");
        when(users.findByGoogleSubject("other")).thenReturn(Optional.of(user));
        new GoogleOidcUserService(users, "owner@example.test")
                .provisionGoogleUser(principal("other", "other@example.test"));
        assertEquals("USER", user.getRoleCode());
    }

    private DefaultOidcUser principal(String subject, String email) {
        Instant now = Instant.now();
        return new DefaultOidcUser(List.of(), new OidcIdToken("test", now, now.plusSeconds(60),
                Map.of("sub", subject, "email", email, "email_verified", true, "name", "Owner")));
    }
}
