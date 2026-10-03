package com.tungnq23.quiz_api.definition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

class MultipleChoiceValidatorTest {

    private QuizDefinitionValidator validator;

    @BeforeEach
    void setUp() {
        validator = new QuizDefinitionValidator(new JsonMapper());
    }

    @Test
    void acceptsValidMultipleChoiceQuestion() {
        assertTrue(validator.validate(validJson()).isEmpty());
    }

    @Test
    void rejectsMultipleChoiceWithOnlyOneCorrectAnswer() {
        String json = validJson().replace(
                "\"correctOptionIds\": [\"a\", \"b\"]",
                "\"correctOptionIds\": [\"a\"]"
        );

        List<ValidationError> errors = validator.validate(json);

        assertEquals(1, errors.size());
        assertEquals("questions[0].correctOptionIds", errors.get(0).path());
    }

    @Test
    void rejectsUnknownAndDuplicateCorrectOptions() {
        String json = validJson().replace(
                "\"correctOptionIds\": [\"a\", \"b\"]",
                "\"correctOptionIds\": [\"a\", \"a\", \"z\"]"
        );

        List<ValidationError> errors = validator.validate(json);

        assertTrue(errors.stream().anyMatch(error ->
                error.path().equals("questions[0].correctOptionIds[1]")));
        assertTrue(errors.stream().anyMatch(error ->
                error.path().equals("questions[0].correctOptionIds[2]")));
    }

    private String validJson() {
        return """
                {
                  "schemaVersion": 1,
                  "categoryCode": "ENGLISH",
                  "title": "Test",
                  "durationMinutes": 10,
                  "questions": [
                    {
                      "id": "q1",
                      "type": "multiple_choice",
                      "prompt": "Choose the correct answers.",
                      "points": 2,
                      "options": [
                        {"id": "a", "text": "Option A"},
                        {"id": "b", "text": "Option B"},
                        {"id": "c", "text": "Option C"}
                      ],
                      "correctOptionIds": ["a", "b"]
                    }
                  ]
                }
                """;
    }
}
