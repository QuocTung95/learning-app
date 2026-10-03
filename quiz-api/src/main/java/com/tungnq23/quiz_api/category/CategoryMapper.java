package com.tungnq23.quiz_api.category;

import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {

    public CategoryDto toDto(Category category) {
        return new CategoryDto(
                category.getId(),
                category.getCode(),
                category.getName()
        );
    }
}
