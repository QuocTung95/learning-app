package com.tungnq23.quiz_api.category;

import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import com.tungnq23.quiz_api.security.CurrentAppUser;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final CurrentAppUser currentUser;

    public CategoryController(CategoryService categoryService, CurrentAppUser currentUser) {
        this.categoryService = categoryService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<CategoryDto> list() {
        return categoryService.findAll();
    }

    @PostMapping
    public ResponseEntity<CategoryDto> create(@RequestBody CreateCategoryRequest request, @AuthenticationPrincipal OidcUser principal) {
        currentUser.adminId(principal);
        return ResponseEntity.status(201).body(categoryService.create(request));
    }
}
