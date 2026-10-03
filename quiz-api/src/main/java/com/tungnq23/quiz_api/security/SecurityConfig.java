package com.tungnq23.quiz_api.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

@Configuration
public class SecurityConfig {

    @Bean
    @Order(1)
    @ConditionalOnProperty(name = "app.oauth2.enabled", havingValue = "true")
    SecurityFilterChain oauthSecurityFilterChain(
            HttpSecurity http,
            GoogleOidcUserService googleOidcUserService,
            CurrentAppUser currentUser,
            @Value("${app.frontend.url:http://localhost:5173}") String frontendUrl) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/", "/index.html", "/assets/**", "/fonts/**", "/favicon.ico", "/explore", "/login", "/forbidden", "/admin", "/admin/**", "/quizzes/*", "/attempts/*", "/attempts/*/result").permitAll()
                        .requestMatchers("/api/ping", "/api/auth/config", "/api/auth/csrf", "/oauth2/**", "/login/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/categories", "/api/quizzes/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/categories", "/api/quiz-definitions/validate").access((authentication, context) ->
                                new AuthorizationDecision(authentication.get().getPrincipal() instanceof OidcUser user && currentUser.isAdmin(user)))
                        .requestMatchers("/api/admin/**").access((authentication, context) ->
                                new AuthorizationDecision(authentication.get().getPrincipal() instanceof OidcUser user && currentUser.isAdmin(user)))
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .defaultAuthenticationEntryPointFor(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                                PathPatternRequestMatcher.withDefaults().matcher("/api/**")))
                .requestCache(cache -> cache.disable())
                .oauth2Login(oauth -> oauth
                        .loginPage("/login")
                        .defaultSuccessUrl(frontendUrl + "/login/success", true)
                        .failureUrl(frontendUrl + "/login?error=google")
                        .userInfoEndpoint(userInfo -> userInfo
                                .oidcUserService(googleOidcUserService)))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .deleteCookies("JSESSIONID")
                        .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)));
        return http.build();
    }

    @Bean
    @Order(2)
    @ConditionalOnMissingBean(name = "oauthSecurityFilterChain")
    SecurityFilterChain developmentSecurityFilterChain(HttpSecurity http, CurrentAppUser currentUser) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/", "/index.html", "/assets/**", "/fonts/**", "/favicon.ico", "/explore", "/login", "/login/success", "/forbidden", "/admin", "/admin/**", "/quizzes/*", "/attempts/*", "/attempts/*/result").permitAll()
                        .requestMatchers("/api/ping", "/api/auth/config", "/api/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/categories", "/api/quizzes/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/categories", "/api/quiz-definitions/validate").access((authentication, context) ->
                                new AuthorizationDecision(authentication.get().getPrincipal() instanceof OidcUser user && currentUser.isAdmin(user)))
                        .requestMatchers("/api/admin/**").access((authentication, context) ->
                                new AuthorizationDecision(authentication.get().getPrincipal() instanceof OidcUser user && currentUser.isAdmin(user)))
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(
                        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .requestCache(cache -> cache.disable());
        return http.build();
    }
}
