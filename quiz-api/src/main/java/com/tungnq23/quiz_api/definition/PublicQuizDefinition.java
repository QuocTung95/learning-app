package com.tungnq23.quiz_api.definition;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** Removes grading keys without modifying the stored definition. */
public final class PublicQuizDefinition {
    private PublicQuizDefinition() {}

    public static JsonNode from(JsonNode definition) {
        JsonNode result = definition.deepCopy();
        for (JsonNode question : result.path("questions")) {
            if (question instanceof ObjectNode object) {
                object.remove("correctOptionId");
                object.remove("correctOptionIds");
                object.remove("acceptedAnswers");
                object.remove("correctPairs");
            }
        }
        return result;
    }
}
