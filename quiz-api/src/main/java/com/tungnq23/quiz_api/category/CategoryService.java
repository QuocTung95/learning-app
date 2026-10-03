package com.tungnq23.quiz_api.category;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    public CategoryService(CategoryRepository categoryRepository, CategoryMapper categoryMapper) {
        this.categoryRepository = categoryRepository;
        this.categoryMapper = categoryMapper;
    }

    public List<CategoryDto> findAll() {
        return categoryRepository.findAllByOrderByNameAscCodeAsc()
            .stream()
            .map(categoryMapper::toDto)
            .toList();
    }

    public CategoryDto create(CreateCategoryRequest request) {
        String code = normalizeCode(request.code());
        String name = normalizeName(request.name());

        if (categoryRepository.existsByCode(code)) {
            throw new CategoryConflictException("Category code already exists: " + code);
        }

        try {
            Category category = categoryRepository.saveAndFlush(Category.create(code, name));
            return categoryMapper.toDto(category);
        } catch (DataIntegrityViolationException exception) {
            // Protect against two concurrent requests passing existsByCode together.
            throw new CategoryConflictException("Category code already exists: " + code);
        }
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new CategoryValidationException("code must not be blank");
        }

        String normalizedCode = code.trim().toUpperCase();
        if (normalizedCode.length() > 40) {
            throw new CategoryValidationException("code must not exceed 40 characters");
        }
        return normalizedCode;
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new CategoryValidationException("name must not be blank");
        }

        String normalizedName = name.trim();
        if (normalizedName.length() > 120) {
            throw new CategoryValidationException("name must not exceed 120 characters");
        }
        return normalizedName;
    }
}
