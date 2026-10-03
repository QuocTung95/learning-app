package com.tungnq23.quiz_api.security;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import com.tungnq23.quiz_api.user.AppRole;
import org.springframework.transaction.annotation.Transactional;

import com.tungnq23.quiz_api.user.AppUser;
import com.tungnq23.quiz_api.user.AppUserRepository;

import java.util.HashSet;
import java.util.Set;
import java.util.Locale;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;

@Service
public class GoogleOidcUserService extends OidcUserService {

    private final AppUserRepository userRepository;
    private final String bootstrapAdminEmail;

    public GoogleOidcUserService(AppUserRepository userRepository,
            @Value("${app.admin.bootstrap-email:}") String bootstrapAdminEmail) {
        this.userRepository = userRepository;
        this.bootstrapAdminEmail = bootstrapAdminEmail.trim();
    }

    @Override
    @Transactional
    public OidcUser loadUser(OidcUserRequest userRequest) {
        return provisionGoogleUser(super.loadUser(userRequest));
    }

    @Transactional
    public OidcUser provisionGoogleUser(OidcUser googleUser) {
        String subject = googleUser.getSubject();
        String email = googleUser.getEmail();
        if (subject == null || subject.isBlank() || email == null || email.isBlank()
                || !Boolean.TRUE.equals(googleUser.getEmailVerified())) {
            throw new OAuth2AuthenticationException(new OAuth2Error("invalid_user_info"),
                    "A verified Google email is required");
        }

        AppUser user = userRepository.findByGoogleSubject(subject)
                .orElseGet(() -> userRepository.findByEmail(email.toLowerCase(Locale.ROOT))
                        .map(existing -> {
                            if (existing.getGoogleSubject() != null
                                    && !existing.getGoogleSubject().equals(subject)) {
                                throw new OAuth2AuthenticationException(new OAuth2Error("account_conflict"),
                                        "Email is linked to another Google account");
                            }
                            // Link an existing account to the stable Google subject.
                            existing.linkGoogleSubject(subject);
                            return existing;
                        })
                        .orElseGet(() -> AppUser.fromGoogle(
                                subject, email, googleUser.getFullName())));
        user.updateGoogleProfile(email, googleUser.getFullName());
        if (!bootstrapAdminEmail.isBlank() && bootstrapAdminEmail.equalsIgnoreCase(email)
                && userRepository.countByRoleCode(AppRole.ADMIN) == 0) {
            user.changeRole(AppRole.ADMIN);
        }
        userRepository.save(user);

        Set<SimpleGrantedAuthority> authorities = new HashSet<>();
        googleUser.getAuthorities().forEach(authority ->
                authorities.add(new SimpleGrantedAuthority(authority.getAuthority())));
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRoleCode()));
        return new DefaultOidcUser(authorities, googleUser.getIdToken(),
                googleUser.getUserInfo(), "sub");
    }
}
