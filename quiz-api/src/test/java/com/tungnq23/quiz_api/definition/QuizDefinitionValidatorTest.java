package com.tungnq23.quiz_api.definition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

class QuizDefinitionValidatorTest {

    private QuizDefinitionValidator validator;

    @BeforeEach
    void setUp() {
        validator = new QuizDefinitionValidator(new JsonMapper());
    }

    @Test
    void acceptsValidSingleChoiceQuestion() {
        List<ValidationError> errors = validator.validate(validJson());

        assertTrue(errors.isEmpty());
    }

    @Test
    void rejectsSingleChoiceWithoutOptions() {
        String json = validJson().replace("\"options\": [", "\"wrongOptions\": [");

        List<ValidationError> errors = validator.validate(json);

        assertTrue(errors.stream().anyMatch(error ->
                error.path().equals("questions[0].options")));
    }

    @Test
    void rejectsCorrectOptionThatDoesNotExist() {
        String json = validJson().replace("\"correctOptionId\": \"b\"", "\"correctOptionId\": \"c\"");

        List<ValidationError> errors = validator.validate(json);

        assertEquals(1, errors.size());
        assertEquals("questions[0].correctOptionId", errors.get(0).path());
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
                      "type": "single_choice",
                      "prompt": "She ___ to school.",
                      "points": 1,
                      "options": [
                        {"id": "a", "text": "go"},
                        {"id": "b", "text": "goes"}
                      ],
                      "correctOptionId": "b"
                    }
                  ]
                }
                """;
    }
}
