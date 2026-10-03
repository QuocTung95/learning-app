package com.tungnq23.quiz_api.admin;

public final class AdminSearch {
    private AdminSearch() {}

    public static String pattern(String text) {
        return "%" + text.trim().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    }
}
