package com.tungnq23.quiz_api.admin;

import java.util.List;
import org.springframework.data.domain.Page;

public record AdminPage<T>(List<T> content, long totalElements, int totalPages, int number) {
    public static <T> AdminPage<T> from(Page<T> page) {
        return new AdminPage<>(page.getContent(), page.getTotalElements(), page.getTotalPages(), page.getNumber());
    }
}
