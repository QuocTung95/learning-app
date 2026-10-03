package com.tungnq23.quiz_api.admin;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import com.tungnq23.quiz_api.user.*;
import com.tungnq23.quiz_api.quiz.*;
import com.tungnq23.quiz_api.category.CategoryRepository;
import com.tungnq23.quiz_api.security.CurrentUserResponse;
import com.tungnq23.quiz_api.attempt.AttemptRepository;
import com.tungnq23.quiz_api.attempt.AttemptStatus;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AppUserRepository users;
    private final QuizRepository quizzes;
    private final CategoryRepository categories;
    private final AdminUserService userService;
    private final AttemptRepository attempts;

    public AdminController(AppUserRepository users, QuizRepository quizzes,
            CategoryRepository categories, AdminUserService userService, AttemptRepository attempts) {
        this.users = users;
        this.quizzes = quizzes;
        this.categories = categories;
        this.userService = userService;
        this.attempts = attempts;
    }

    @GetMapping("/overview")
    public Overview overview() {
        return new Overview(users.count(), users.countByRoleCode(AppRole.ADMIN), categories.count(),
                quizzes.count(), quizzes.countByStatus(QuizStatus.DRAFT), quizzes.countByStatus(QuizStatus.ACTIVE), attempts.countByStatus(AttemptStatus.SUBMITTED));
    }

    @GetMapping("/users")
    public AdminPage<CurrentUserResponse> users(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "") String q) {
        return AdminPage.from(users.search(AdminSearch.pattern(q), PageRequest.of(Math.max(0, page), 20, Sort.by("id").descending()))
                .map(user -> new CurrentUserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getRoleCode())));
    }

    @PatchMapping("/users/{userId}/role")
    public CurrentUserResponse role(@PathVariable Long userId, @RequestBody RoleRequest request,
            @AuthenticationPrincipal OidcUser principal) {
        return userService.changeRole(userId, request.roleCode(), principal);
    }

    public record RoleRequest(AppRole roleCode) {}
    public record Overview(long users, long admins, long categories, long quizzes, long drafts, long activeQuizzes, long submittedAttempts) {}
}
