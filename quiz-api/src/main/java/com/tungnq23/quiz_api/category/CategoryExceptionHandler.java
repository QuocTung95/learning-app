package com.tungnq23.quiz_api.category;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class CategoryExceptionHandler {

    @ExceptionHandler(CategoryValidationException.class)
    public ResponseEntity<Map<String, String>> handleValidation(CategoryValidationException exception) {
        return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
    }

    @ExceptionHandler(CategoryConflictException.class)
    public ResponseEntity<Map<String, String>> handleConflict(CategoryConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", exception.getMessage()));
    }
}
