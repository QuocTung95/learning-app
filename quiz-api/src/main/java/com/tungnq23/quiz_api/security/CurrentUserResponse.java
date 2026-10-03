package com.tungnq23.quiz_api.security;

public record CurrentUserResponse(
        Long id,
        String email,
        String displayName,
        String roleCode
) {
}
