package com.tungnq23.quiz_api.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.test.web.servlet.MockMvc;

import com.tungnq23.quiz_api.category.*;
import com.tungnq23.quiz_api.quiz.*;
import com.tungnq23.quiz_api.user.*;
import com.tungnq23.quiz_api.attempt.*;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
        "spring.profiles.active=test",
        "spring.datasource.url=jdbc:h2:mem:google-session;MODE=Oracle;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa",
        "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.oauth2.enabled=true", "app.frontend.url=http://localhost:5173",
        "spring.security.oauth2.client.registration.google.client-id=test-client",
        "spring.security.oauth2.client.registration.google.client-secret=test-only-placeholder",
        "spring.security.oauth2.client.registration.google.scope=openid,profile,email",
        "spring.security.oauth2.client.registration.google.redirect-uri=http://localhost:8080/login/oauth2/code/google"
})
@AutoConfigureMockMvc
class GoogleSessionTests {
    @Autowired MockMvc mvc;
    @Autowired AppUserRepository users;
    @Autowired CategoryRepository categories;
    @Autowired QuizRepository quizzes;
    @Autowired QuizVersionRepository versions;
    @Autowired GoogleOidcUserService googleUsers;
    @Autowired JsonMapper json;
    @Autowired AttemptRepository attempts;
    @Autowired AttemptAnswerRepository attemptAnswers;
    @Autowired RetakeGrantRepository grants;

    @Test
    void anonymousCanBrowseButCannotImpersonateUsingHeader() throws Exception {
        mvc.perform(get("/api/categories")).andExpect(status().isOk());
        mvc.perform(get("/api/auth/config")).andExpect(status().isOk())
                .andExpect(jsonPath("$.googleEnabled").value(true));
        mvc.perform(get("/api/me").header("X-User-Id", "1")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/attempts/1").header("X-User-Id", "1")).andExpect(status().isUnauthorized());
    }

    @Test
    void googleAuthorizationUsesRegisteredCallback() throws Exception {
        mvc.perform(get("/oauth2/authorization/google")).andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.startsWith("https://accounts.google.com/"),
                        org.hamcrest.Matchers.containsString("redirect_uri=http://localhost:8080/login/oauth2/code/google"))));
    }

    @Test
    void combinedDeploymentServesFrontendRoutesWithoutExposingAdminApis() throws Exception {
        for (String path : List.of("/", "/login", "/login/success", "/admin", "/admin/attempts", "/quizzes/1", "/attempts/1/result")) {
            mvc.perform(get(path)).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
        }
        mvc.perform(get("/api/admin/attempts")).andExpect(status().isUnauthorized());
    }

    @Test
    void meReturnsDatabaseIdentityAndRole() throws Exception {
        AppUser user = user("USER");
        mvc.perform(get("/api/me").with(oidcLogin().oidcUser(principal(user)))
                        .header("X-User-Id", "99999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(user.getId()))
                .andExpect(jsonPath("$.roleCode").value("USER"));
    }

    @Test
    void adminApisRejectUsersEvenWithStaleOrForgedAdminAuthority() throws Exception {
        AppUser user = user("USER");
        OidcUser stale = principal(user.getGoogleSubject(), user.getEmail(), true, "ADMIN");
        for (String path : List.of("/api/admin/overview", "/api/admin/users", "/api/admin/quizzes", "/api/admin/quizzes/1/definition", "/api/admin/attempts", "/api/admin/attempts/1")) {
            mvc.perform(get(path).with(oidcLogin().oidcUser(stale))).andExpect(status().isForbidden());
        }
    }

    @Test
    void adminSubmittedAttemptsSupportCombinedFiltersVietnamDatesAndPaging() throws Exception {
        AppUser admin = user("ADMIN");
        AppUser student = user("USER");
        Quiz quiz = quiz(admin);
        QuizVersion version = versions.findByQuizIdAndStatus(quiz.getId(), QuizVersionStatus.ACTIVE).orElseThrow();
        String userSearch = student.getEmail().toUpperCase();
        Attempt first = submitted(student, quiz, version, "2026-10-03T00:00:00+07:00", 1, 1, SubmissionMethod.USER, null);
        Attempt last = submitted(student, quiz, version, "2026-10-03T23:59:59+07:00", 0, 1, SubmissionMethod.USER, null);
        submitted(student, quiz, version, "2026-10-02T23:59:59+07:00", 1, 1, SubmissionMethod.USER, null);
        submitted(student, quiz, version, "2026-10-04T00:00:00+07:00", 1, 1, SubmissionMethod.USER, null);
        AppUser other = user("USER");
        submitted(other, quiz, version, "2026-10-03T12:00:00+07:00", 1, 1, SubmissionMethod.USER, null);
        Attempt ongoing = attempts.save(new Attempt(student, quiz, version, OffsetDateTime.parse("2026-10-03T10:00:00+07:00"),
                OffsetDateTime.parse("2026-10-03T10:10:00+07:00"), BigDecimal.ONE));
        Attempt expired = new Attempt(student, quiz, version, OffsetDateTime.parse("2026-10-03T09:00:00+07:00"),
                OffsetDateTime.parse("2026-10-03T09:10:00+07:00"), BigDecimal.ONE);
        expired.expire(); attempts.save(expired);

        mvc.perform(get("/api/admin/attempts").with(oidcLogin().oidcUser(principal(admin)))
                        .param("categoryId", quiz.getCategory().getId().toString()).param("quizId", quiz.getId().toString())
                        .param("user", userSearch).param("from", "2026-10-03").param("to", "2026-10-03"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].attemptId").value(last.getId()))
                .andExpect(jsonPath("$.content[1].attemptId").value(first.getId()))
                .andExpect(jsonPath("$.content[0].answers").doesNotExist());
        mvc.perform(get("/api/admin/attempts").with(oidcLogin().oidcUser(principal(admin)))
                        .param("quizId", quiz.getId().toString()).param("user", userSearch)
                        .param("from", "2026-10-03").param("to", "2026-10-03").param("minPercent", "50").param("maxPercent", "100"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].percent").value(100));
        mvc.perform(get("/api/admin/attempts").with(oidcLogin().oidcUser(principal(admin)))
                        .param("quizId", quiz.getId().toString()).param("user", userSearch)
                        .param("from", "2026-10-03").param("to", "2026-10-03").param("order", "SCORE_LOW").param("size", "1").param("page", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].attemptId").value(first.getId()));
        attemptAnswers.save(new AttemptAnswer(first, "q1", "\"a\"", BigDecimal.ONE));
        mvc.perform(get("/api/admin/attempts/" + first.getId()).with(oidcLogin().oidcUser(principal(admin))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.summary.email").value(student.getEmail()))
                .andExpect(jsonPath("$.definition.questions[0].correctOptionId").value("a"))
                .andExpect(jsonPath("$.answers[0].pointsAwarded").value(1));
        mvc.perform(get("/api/admin/attempts/" + ongoing.getId()).with(oidcLogin().oidcUser(principal(admin))))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/quizzes").param("categoryId", quiz.getCategory().getId().toString())
                        .with(oidcLogin().oidcUser(principal(admin))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void submissionMethodRetakesAndInvalidFiltersAreHandled() throws Exception {
        AppUser admin = user("ADMIN");
        AppUser student = user("USER");
        Quiz quiz = quiz(admin);
        QuizVersion version = versions.findByQuizIdAndStatus(quiz.getId(), QuizVersionStatus.ACTIVE).orElseThrow();
        Attempt source = submitted(student, quiz, version, "2026-10-02T12:00:00+07:00", 0, 1, SubmissionMethod.USER, null);
        Long grantId = grants.save(new RetakeGrant(source.getId(), admin.getId())).getId();
        Attempt retake = submitted(student, quiz, version, "2026-10-03T12:00:00+07:00", 1, 1, SubmissionMethod.AUTO, grantId);
        mvc.perform(get("/api/admin/attempts").param("quizId", quiz.getId().toString()).param("retake", "true").param("method", "AUTO")
                        .with(oidcLogin().oidcUser(principal(admin))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].attemptId").value(retake.getId()))
                .andExpect(jsonPath("$.content[0].retake").value(true));
        mvc.perform(get("/api/admin/attempts").param("quizId", quiz.getId().toString()).param("retake", "false").param("method", "USER")
                        .with(oidcLogin().oidcUser(principal(admin))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].attemptId").value(source.getId()));
        for (String[] pair : List.of(new String[]{"minPercent", "-1"}, new String[]{"maxPercent", "101"},
                new String[]{"size", "101"}, new String[]{"page", "-1"}, new String[]{"from", "invalid-date"})) {
            mvc.perform(get("/api/admin/attempts").param(pair[0], pair[1]).with(oidcLogin().oidcUser(principal(admin))))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/admin/attempts").param("from", "2026-10-04").param("to", "2026-10-03")
                        .with(oidcLogin().oidcUser(principal(admin)))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/attempts").param("minPercent", "90").param("maxPercent", "20")
                        .with(oidcLogin().oidcUser(principal(admin)))).andExpect(status().isBadRequest());
    }

    private Attempt submitted(AppUser student, Quiz quiz, QuizVersion version, String timestamp,
            int score, int max, SubmissionMethod method, Long grantId) {
        OffsetDateTime time = OffsetDateTime.parse(timestamp);
        Attempt attempt = new Attempt(student, quiz, version, time.minusMinutes(5), time.plusMinutes(5), BigDecimal.valueOf(max), grantId);
        attempt.submit(method, BigDecimal.valueOf(score), time);
        return attempts.save(attempt);
    }

    @Test
    void adminCanManageRolesAndChangesApplyToExistingSessions() throws Exception {
        AppUser admin = user("ADMIN");
        AppUser target = user("USER");
        OidcUser targetSession = principal(target);
        mvc.perform(get("/api/admin/overview").with(oidcLogin().oidcUser(principal(admin))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.admins").isNumber());
        mvc.perform(get("/api/admin/users").param("q", target.getEmail()).with(oidcLogin().oidcUser(principal(admin))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(patch("/api/admin/users/" + target.getId() + "/role")
                        .with(oidcLogin().oidcUser(principal(admin))).contentType("application/json").content("{\"roleCode\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/users/" + target.getId() + "/role")
                        .with(oidcLogin().oidcUser(principal(admin))).with(csrf())
                        .contentType("application/json").content("{\"roleCode\":\"ADMIN\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.roleCode").value("ADMIN"));
        mvc.perform(get("/api/admin/overview").with(oidcLogin().oidcUser(targetSession))).andExpect(status().isOk());
        OidcUser oldAdminSession = principal(target.getGoogleSubject(), target.getEmail(), true, "ADMIN");
        mvc.perform(patch("/api/admin/users/" + target.getId() + "/role")
                        .with(oidcLogin().oidcUser(principal(admin))).with(csrf())
                        .contentType("application/json").content("{\"roleCode\":\"USER\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admin/users").with(oidcLogin().oidcUser(oldAdminSession))).andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/users/" + target.getId() + "/role")
                        .with(oidcLogin().oidcUser(principal(admin))).with(csrf())
                        .contentType("application/json").content("{\"roleCode\":\"OWNER\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/admin/users/" + target.getId() + "/role")
                        .with(oidcLogin().oidcUser(principal(admin))).with(csrf())
                        .contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/admin/users/" + admin.getId() + "/role")
                        .with(oidcLogin().oidcUser(principal(admin))).with(csrf())
                        .contentType("application/json").content("{\"roleCode\":\"USER\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void adminCanCreateInspectListAndPublishJsonWithoutLeakingAnswers() throws Exception {
        AppUser creator = user("ADMIN");
        AppUser publisher = user("ADMIN");
        Category category = categories.save(Category.create(UUID.randomUUID().toString().toUpperCase(), "Admin flow"));
        String definition = """
                {"schemaVersion":1,"categoryCode":"%s","title":"Admin draft","durationMinutes":10,
                 "questions":[{"id":"q1","type":"single_choice","prompt":"Question","points":1,
                 "options":[{"id":"a","text":"A"}],"correctOptionId":"a"}]}
                """.formatted(category.getCode());
        var response = mvc.perform(post("/api/admin/quizzes").with(oidcLogin().oidcUser(principal(creator))).with(csrf())
                        .contentType("application/json").content(definition))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("DRAFT")).andReturn();
        long quizId = json.readTree(response.getResponse().getContentAsString()).get("quizId").longValue();
        mvc.perform(get("/api/admin/quizzes").param("q", "Admin draft").param("status", "DRAFT")
                        .with(oidcLogin().oidcUser(principal(creator))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(quizId));
        mvc.perform(get("/api/admin/quizzes/" + quizId + "/definition").with(oidcLogin().oidcUser(principal(creator))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.questions[0].correctOptionId").value("a"));
        mvc.perform(get("/api/quizzes/" + quizId)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/quizzes/" + quizId + "/publish").with(oidcLogin().oidcUser(principal(publisher))).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(get("/api/quizzes/" + quizId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.questions[0].correctOptionId").doesNotExist());
    }

    @Test
    void publicCatalogShowsOnlyPublishedQuizzesAndSupportsCategoryAndSearch() throws Exception {
        AppUser creator = user("ADMIN");
        Quiz published = quiz(creator);
        quizzes.save(new Quiz(published.getCategory(), creator, "Test quiz draft"));
        mvc.perform(get("/api/quizzes").param("categoryId", published.getCategory().getId().toString())
                        .param("q", "Test quiz"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(published.getId()))
                .andExpect(jsonPath("$.content[0].questionCount").value(1))
                .andExpect(jsonPath("$.content[0].durationMinutes").value(10))
                .andExpect(jsonPath("$.content[0].contentJson").doesNotExist())
                .andExpect(jsonPath("$.content[0].createdBy").doesNotExist());
        mvc.perform(get("/api/quizzes").param("categoryId", published.getCategory().getId().toString())
                        .param("q", "No matching title"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void userCanSubmitAndPracticeTheSameQuizRepeatedlyWithoutAdminGrant() throws Exception {
        AppUser student = user("USER");
        Quiz published = quiz(student);
        long previousId = -1;
        for (int i = 0; i < 3; i++) {
            var response = mvc.perform(post("/api/quizzes/" + published.getId() + "/attempts")
                            .with(oidcLogin().oidcUser(principal(student))).with(csrf()))
                    .andExpect(status().isOk()).andReturn();
            long id = json.readTree(response.getResponse().getContentAsString()).get("attemptId").longValue();
            assertNotEquals(previousId, id);
            previousId = id;
            mvc.perform(post("/api/attempts/" + id + "/submit").with(oidcLogin().oidcUser(principal(student)))
                            .with(csrf()).contentType("application/json").content("{\"q1\":\"a\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SUBMITTED"))
                    .andExpect(jsonPath("$.totalScore").value(1));
        }
    }

    @Test
    void sessionUserCanStartAndReadOwnAttemptWithoutIdentityHeader() throws Exception {
        AppUser user = user("USER");
        Quiz quiz = quiz(user);
        var response = mvc.perform(post("/api/quizzes/" + quiz.getId() + "/attempts")
                        .with(oidcLogin().oidcUser(principal(user))).with(csrf())
                        .header("X-User-Id", "99999"))
                .andExpect(status().isOk()).andReturn();
        long attemptId = json.readTree(response.getResponse().getContentAsString()).get("attemptId").longValue();
        mvc.perform(get("/api/attempts/" + attemptId).with(oidcLogin().oidcUser(principal(user))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/attempts/" + attemptId + "/definition")
                        .with(oidcLogin().oidcUser(principal(user))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.questions[0].correctOptionId").doesNotExist());
        AppUser other = user("USER");
        mvc.perform(get("/api/attempts/" + attemptId).with(oidcLogin().oidcUser(principal(other))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void mutationRequiresCsrfAndTokenEndpointWorksForSpa() throws Exception {
        AppUser user = user("USER");
        Quiz quiz = quiz(user);
        mvc.perform(post("/api/quizzes/" + quiz.getId() + "/attempts")
                        .with(oidcLogin().oidcUser(principal(user))))
                .andExpect(status().isForbidden());
        var tokenResponse = mvc.perform(get("/api/auth/csrf").with(oidcLogin().oidcUser(principal(user))))
                .andExpect(status().isOk()).andReturn();
        var token = json.readTree(tokenResponse.getResponse().getContentAsString());
        MockHttpSession session = (MockHttpSession) tokenResponse.getRequest().getSession();
        mvc.perform(post("/api/quizzes/" + quiz.getId() + "/attempts").session(session)
                        .with(oidcLogin().oidcUser(principal(user)))
                        .header(token.get("headerName").stringValue(), token.get("token").stringValue()))
                .andExpect(status().isOk());
    }

    @Test
    void userCannotCreateCategoryOrUseAdminApis() throws Exception {
        AppUser user = user("USER");
        mvc.perform(post("/api/categories").with(oidcLogin().oidcUser(principal(user))).with(csrf())
                        .contentType("application/json").content("{\"code\":\"NO\",\"name\":\"No\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/quizzes").with(oidcLogin().oidcUser(principal(user))).with(csrf())
                        .contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanCreateCategory() throws Exception {
        AppUser admin = user("ADMIN");
        String code = UUID.randomUUID().toString();
        mvc.perform(post("/api/categories").with(oidcLogin().oidcUser(principal(admin))).with(csrf())
                        .contentType("application/json").content("{\"code\":\"" + code + "\",\"name\":\"Test\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void logoutRequiresCsrfAndClearsSession() throws Exception {
        AppUser user = user("USER");
        mvc.perform(post("/api/auth/logout").with(oidcLogin().oidcUser(principal(user))))
                .andExpect(status().isForbidden());
        MockHttpSession session = new MockHttpSession();
        mvc.perform(post("/api/auth/logout").session(session)
                        .with(oidcLogin().oidcUser(principal(user))).with(csrf()))
                .andExpect(status().isNoContent());
        assertTrue(session.isInvalid());
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void firstVerifiedGoogleLoginCreatesUserAndRepeatedLoginReusesIt() {
        String subject = UUID.randomUUID().toString();
        OidcUser principal = principal(subject, subject + "@example.test", true, "USER");
        googleUsers.provisionGoogleUser(principal);
        AppUser first = users.findByGoogleSubject(subject).orElseThrow();
        assertEquals("USER", first.getRoleCode());
        googleUsers.provisionGoogleUser(principal);
        assertEquals(first.getId(), users.findByGoogleSubject(subject).orElseThrow().getId());
    }

    @Test
    void unverifiedEmailCannotCreateAnAccount() {
        String subject = UUID.randomUUID().toString();
        assertThrows(OAuth2AuthenticationException.class,
                () -> googleUsers.provisionGoogleUser(principal(subject, subject + "@example.test", false, "USER")));
        assertTrue(users.findByGoogleSubject(subject).isEmpty());
    }

    @Test
    void existingLinkedEmailCannotBeTakenByAnotherSubject() {
        AppUser existing = user("ADMIN");
        assertThrows(OAuth2AuthenticationException.class,
                () -> googleUsers.provisionGoogleUser(principal("other-subject", existing.getEmail(), true, "USER")));
        assertEquals(existing.getGoogleSubject(), users.findById(existing.getId()).orElseThrow().getGoogleSubject());
    }

    private AppUser user(String role) {
        String subject = UUID.randomUUID().toString();
        AppUser user = AppUser.fromGoogle(subject, subject + "@example.test", "Test user");
        user.changeRole(AppRole.valueOf(role));
        return users.save(user);
    }

    private OidcUser principal(AppUser user) {
        return principal(user.getGoogleSubject(), user.getEmail(), true, user.getRoleCode());
    }

    private OidcUser principal(String subject, String email, boolean verified, String role) {
        Instant now = Instant.now();
        var token = new OidcIdToken("synthetic-test-token", now, now.plusSeconds(60),
                Map.of("sub", subject, "email", email, "email_verified", verified, "name", "Test user"));
        return new DefaultOidcUser(List.of(new SimpleGrantedAuthority("ROLE_" + role)), token);
    }

    private Quiz quiz(AppUser user) {
        Category category = categories.save(Category.create(UUID.randomUUID().toString(), "Test"));
        Quiz quiz = new Quiz(category, user, "Test quiz");
        quiz.activate();
        quizzes.save(quiz);
        QuizVersion version = new QuizVersion(quiz, 1, 10, """
                {"schemaVersion":1,"categoryCode":"TEST","title":"Test quiz","durationMinutes":10,
                 "questions":[{"id":"q1","type":"single_choice","prompt":"Q","points":1,
                 "options":[{"id":"a","text":"A"}],"correctOptionId":"a"}]}
                """);
        version.activate();
        versions.save(version);
        return quiz;
    }
}
