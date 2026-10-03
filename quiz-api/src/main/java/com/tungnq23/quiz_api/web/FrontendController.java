package com.tungnq23.quiz_api.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FrontendController {
    // Serve React's router on a refresh or a shared deep link.
    @GetMapping({"/", "/explore", "/login", "/login/success", "/forbidden", "/admin", "/admin/**",
            "/quizzes/{quizId}", "/attempts/{attemptId}", "/attempts/{attemptId}/result"})
    public String app() {
        return "forward:/index.html";
    }
}
