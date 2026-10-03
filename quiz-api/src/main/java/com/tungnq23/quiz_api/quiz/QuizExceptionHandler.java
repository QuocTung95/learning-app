package com.tungnq23.quiz_api.quiz;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class QuizExceptionHandler {

    @ExceptionHandler(QuizCreationException.class)
    public ResponseEntity<Map<String, String>> handleCreation(QuizCreationException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", exception.getMessage()));
    }
}
