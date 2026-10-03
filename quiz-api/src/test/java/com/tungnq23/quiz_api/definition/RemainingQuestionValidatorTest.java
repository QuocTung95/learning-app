package com.tungnq23.quiz_api.definition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

class RemainingQuestionValidatorTest {

    private QuizDefinitionValidator validator;

    @BeforeEach
    void setUp() {
        validator = new QuizDefinitionValidator(new JsonMapper());
    }

    @Test
    void acceptsDropdown() {
        assertTrue(validator.validate(base("""
                "type": "dropdown",
                "options": [{"id":"a","text":"A"}],
                "correctOptionId": "a"
                """)).isEmpty());
    }

    @Test
    void rejectsEmptyShortAnswerList() {
        List<ValidationError> errors = validator.validate(base("""
                "type": "short_answer",
                "acceptedAnswers": []
                """));

        assertEquals("questions[0].acceptedAnswers", errors.get(0).path());
    }

    @Test
    void rejectsUnmatchedMatchingItem() {
        List<ValidationError> errors = validator.validate(base("""
                "type": "matching",
                "left": [{"id":"l1","text":"L1"}],
                "right": [{"id":"r1","text":"R1"}],
                "correctPairs": []
                """));

        assertTrue(errors.stream().anyMatch(error ->
                error.path().equals("questions[0].correctPairs")));
    }

    private String base(String questionFields) {
        return """
                {
                  "schemaVersion": 1,
                  "categoryCode": "ENGLISH",
                  "title": "Test",
                  "durationMinutes": 10,
                  "questions": [{
                    "id": "q1",
                    "prompt": "Question",
                    "points": 1,
                    %s
                  }]
                }
                """.formatted(questionFields);
    }
}
