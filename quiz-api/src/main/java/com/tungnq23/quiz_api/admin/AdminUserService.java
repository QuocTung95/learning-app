package com.tungnq23.quiz_api.admin;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import com.tungnq23.quiz_api.security.CurrentAppUser;
import com.tungnq23.quiz_api.security.CurrentUserResponse;
import com.tungnq23.quiz_api.user.*;

@Service
public class AdminUserService {
    private final AppUserRepository users;
    private final CurrentAppUser currentUser;

    public AdminUserService(AppUserRepository users, CurrentAppUser currentUser) {
        this.users = users;
        this.currentUser = currentUser;
    }

    @Transactional
    public CurrentUserResponse changeRole(Long userId, AppRole role, OidcUser principal) {
        users.findFirstByOrderByIdAsc();
        Long actorId = currentUser.adminId(principal);
        if (role == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must be USER or ADMIN");
        if (actorId.equals(userId) && role != AppRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn không thể tự hạ quyền quản trị của mình.");
        }
        AppUser user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.changeRole(role);
        return new CurrentUserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getRoleCode());
    }
}
