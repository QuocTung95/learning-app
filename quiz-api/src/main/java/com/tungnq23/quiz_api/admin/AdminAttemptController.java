package com.tungnq23.quiz_api.admin;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import com.tungnq23.quiz_api.attempt.SubmissionMethod;

@RestController
@RequestMapping("/api/admin/attempts")
public class AdminAttemptController {
    private final AdminAttemptService service;
    public AdminAttemptController(AdminAttemptService service) { this.service = service; }

    @GetMapping
    public AdminPage<AdminAttemptService.Summary> list(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long categoryId, @RequestParam(required = false) Long quizId,
            @RequestParam(defaultValue = "") String user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) BigDecimal minPercent, @RequestParam(required = false) BigDecimal maxPercent,
            @RequestParam(required = false) SubmissionMethod method, @RequestParam(required = false) Boolean retake,
            @RequestParam(defaultValue = "NEWEST") AdminAttemptService.Order order) {
        return service.list(page, size, categoryId, quizId, user, from, to, minPercent, maxPercent, method, retake, order);
    }

    @GetMapping("/{attemptId}")
    public AdminAttemptService.Detail detail(@PathVariable Long attemptId) { return service.detail(attemptId); }
}
