package com.tungnq23.quiz_api.definition;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Component
public class QuizDefinitionValidator {

    private static final Set<String> QUESTION_TYPES = Set.of(
            "single_choice", "multiple_choice", "dropdown",
            "short_answer", "matching"
    );

    private final JsonMapper jsonMapper;

    public QuizDefinitionValidator(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    public List<ValidationError> validate(String rawJson) {
        List<ValidationError> errors = new ArrayList<>();
        if (rawJson == null || rawJson.isBlank()) {
            errors.add(new ValidationError("$", "JSON không được để trống"));
            return errors;
        }

        JsonNode root;
        try {
            root = jsonMapper.readTree(rawJson);
        } catch (JacksonException exception) {
            errors.add(new ValidationError("$", "JSON sai cú pháp"));
            return errors;
        }

        if (root == null || !root.isObject()) {
            errors.add(new ValidationError("$", "Đề bài phải là một JSON object"));
            return errors;
        }

        positiveInteger(root, "schemaVersion", "", errors);
        requiredString(root, "categoryCode", "", 40, errors);
        requiredString(root, "title", "", 200, errors);
        positiveInteger(root, "durationMinutes", "", errors);

        JsonNode questions = requiredArray(root, "questions", "", errors);
        if (questions == null) {
            return List.copyOf(errors);
        }
        if (questions.isEmpty()) {
            errors.add(new ValidationError("questions", "Cần ít nhất một câu hỏi"));
        }

        Set<String> questionIds = new HashSet<>();
        for (int i = 0; i < questions.size(); i++) {
            String path = "questions[" + i + "]";
            JsonNode question = questions.get(i);
            if (!question.isObject()) {
                errors.add(new ValidationError(path, "Câu hỏi phải là object"));
                continue;
            }

            String id = requiredString(question, "id", path, 80, errors);
            if (id != null && !questionIds.add(id)) {
                errors.add(new ValidationError(path + ".id", "ID câu hỏi bị trùng: " + id));
            }
            requiredString(question, "prompt", path, 10_000, errors);
            positiveInteger(question, "points", path, errors);
            String type = requiredString(question, "type", path, 40, errors);
            if (type != null && !QUESTION_TYPES.contains(type)) {
                errors.add(new ValidationError(path + ".type", "Dạng câu hỏi chưa được hỗ trợ: " + type));
            }
            if ("single_choice".equals(type) || "dropdown".equals(type)) {
                validateSingleChoice(question, path, errors);
            }
            if ("multiple_choice".equals(type)) {
                validateMultipleChoice(question, path, errors);
            }
            if ("short_answer".equals(type)) {
                validateShortAnswer(question, path, errors);
            }
            if ("matching".equals(type)) {
                validateMatching(question, path, errors);
            }
        }

        return List.copyOf(errors);
    }

    private void validateSingleChoice(JsonNode question, String path,
            List<ValidationError> errors) {
        Set<String> optionIds = validateOptions(question, path, errors);
        String correctOptionId = requiredString(
                question, "correctOptionId", path, 80, errors
        );

        if (correctOptionId != null && !optionIds.contains(correctOptionId)) {
            errors.add(new ValidationError(
                    path + ".correctOptionId",
                    "Đáp án đúng không tồn tại trong options: " + correctOptionId
            ));
        }
    }

    private void validateMultipleChoice(JsonNode question, String path,
            List<ValidationError> errors) {
        Set<String> optionIds = validateOptions(question, path, errors);
        JsonNode correctOptionIds = requiredArray(
                question, "correctOptionIds", path, errors
        );
        if (correctOptionIds == null) {
            return;
        }

        if (correctOptionIds.size() < 2) {
            errors.add(new ValidationError(
                    path + ".correctOptionIds",
                    "Cần ít nhất hai đáp án đúng"
            ));
        }

        Set<String> seenIds = new HashSet<>();
        for (int i = 0; i < correctOptionIds.size(); i++) {
            String optionPath = path + ".correctOptionIds[" + i + "]";
            String id = requiredStringValue(
                    correctOptionIds.get(i), optionPath, 80, errors
            );
            if (id == null) {
                continue;
            }

            if (!seenIds.add(id)) {
                errors.add(new ValidationError(
                        optionPath, "Đáp án đúng bị trùng: " + id
                ));
            }
            if (!optionIds.contains(id)) {
                errors.add(new ValidationError(
                        optionPath, "Option không tồn tại: " + id
                ));
            }
        }
    }

    private void validateShortAnswer(JsonNode question, String path,
            List<ValidationError> errors) {
        JsonNode acceptedAnswers = requiredArray(
                question, "acceptedAnswers", path, errors
        );
        if (acceptedAnswers == null) {
            return;
        }
        if (acceptedAnswers.isEmpty()) {
            errors.add(new ValidationError(
                    path + ".acceptedAnswers",
                    "acceptedAnswers không được rỗng"
            ));
        }
        for (int i = 0; i < acceptedAnswers.size(); i++) {
            requiredStringValue(
                    acceptedAnswers.get(i),
                    path + ".acceptedAnswers[" + i + "]",
                    500,
                    errors
            );
        }
    }

    private void validateMatching(JsonNode question, String path,
            List<ValidationError> errors) {
        Set<String> leftIds = validateItems(question, "left", path, errors);
        Set<String> rightIds = validateItems(question, "right", path, errors);

        Integer points = positiveInteger(question, "points", path, errors);
        if (points != null && points != leftIds.size()) {
            errors.add(new ValidationError(
                    path + ".points",
                    "points phải bằng số phần tử bên trái: " + leftIds.size()
            ));
        }

        JsonNode pairs = requiredArray(question, "correctPairs", path, errors);
        if (pairs == null) {
            return;
        }

        Set<String> usedLeft = new HashSet<>();
        Set<String> usedRight = new HashSet<>();
        for (int i = 0; i < pairs.size(); i++) {
            String pairPath = path + ".correctPairs[" + i + "]";
            JsonNode pair = pairs.get(i);
            if (!pair.isObject()) {
                errors.add(new ValidationError(pairPath, "Pair phải là object"));
                continue;
            }

            String leftId = requiredString(pair, "leftId", pairPath, 80, errors);
            String rightId = requiredString(pair, "rightId", pairPath, 80, errors);
            if (leftId != null) {
                if (!leftIds.contains(leftId)) {
                    errors.add(new ValidationError(
                            pairPath + ".leftId", "Mục bên trái không tồn tại: " + leftId
                    ));
                }
                if (!usedLeft.add(leftId)) {
                    errors.add(new ValidationError(
                            pairPath + ".leftId", "Mục bên trái bị ghép nhiều lần: " + leftId
                    ));
                }
            }
            if (rightId != null) {
                if (!rightIds.contains(rightId)) {
                    errors.add(new ValidationError(
                            pairPath + ".rightId", "Mục bên phải không tồn tại: " + rightId
                    ));
                }
                if (!usedRight.add(rightId)) {
                    errors.add(new ValidationError(
                            pairPath + ".rightId", "Mục bên phải bị ghép nhiều lần: " + rightId
                    ));
                }
            }
        }
        for (String leftId : leftIds) {
            if (!usedLeft.contains(leftId)) {
                errors.add(new ValidationError(
                        path + ".correctPairs", "Chưa ghép mục bên trái: " + leftId
                ));
            }
        }
    }

    private Set<String> validateItems(JsonNode parent, String field, String parentPath,
            List<ValidationError> errors) {
        Set<String> ids = new HashSet<>();
        JsonNode items = requiredArray(parent, field, parentPath, errors);
        if (items == null) {
            return ids;
        }
        if (items.isEmpty()) {
            errors.add(new ValidationError(
                    fieldPath(parentPath, field), "Danh sách không được rỗng"
            ));
        }
        for (int i = 0; i < items.size(); i++) {
            String itemPath = fieldPath(parentPath, field) + "[" + i + "]";
            JsonNode item = items.get(i);
            if (!item.isObject()) {
                errors.add(new ValidationError(itemPath, "Phần tử phải là object"));
                continue;
            }
            String id = requiredString(item, "id", itemPath, 80, errors);
            requiredString(item, "text", itemPath, 10_000, errors);
            if (id != null && !ids.add(id)) {
                errors.add(new ValidationError(itemPath + ".id", "ID bị trùng: " + id));
            }
        }
        return ids;
    }

    private Set<String> validateOptions(JsonNode question, String path,
            List<ValidationError> errors) {
        Set<String> optionIds = new HashSet<>();
        JsonNode options = requiredArray(question, "options", path, errors);
        if (options == null) {
            return optionIds;
        }

        if (options.isEmpty()) {
            errors.add(new ValidationError(
                    path + ".options", "Danh sách options không được rỗng"
            ));
        }

        for (int i = 0; i < options.size(); i++) {
            String optionPath = path + ".options[" + i + "]";
            JsonNode option = options.get(i);

            if (!option.isObject()) {
                errors.add(new ValidationError(
                        optionPath, "Option phải là object"
                ));
                continue;
            }

            String id = requiredString(option, "id", optionPath, 80, errors);
            requiredString(option, "text", optionPath, 10_000, errors);

            if (id != null && !optionIds.add(id)) {
                errors.add(new ValidationError(
                        optionPath + ".id", "ID option bị trùng: " + id
                ));
            }
        }

        return optionIds;
    }

    private JsonNode requiredArray(JsonNode parent, String field, String parentPath,
            List<ValidationError> errors) {
        JsonNode value = parent.get(field);
        if (value == null || !value.isArray()) {
            errors.add(new ValidationError(fieldPath(parentPath, field), "Phải là một mảng"));
            return null;
        }
        return value;
    }

    private Integer positiveInteger(JsonNode parent, String field, String parentPath,
            List<ValidationError> errors) {
        JsonNode value = parent.get(field);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToInt()
                || value.intValue() <= 0) {
            errors.add(new ValidationError(fieldPath(parentPath, field), "Phải là số nguyên dương"));
            return null;
        }
        return value.intValue();
    }

    private String requiredString(JsonNode parent, String field, String parentPath,
            int maxLength, List<ValidationError> errors) {
        return requiredStringValue(
                parent.get(field), fieldPath(parentPath, field), maxLength, errors
        );
    }

    private String requiredStringValue(JsonNode value, String path, int maxLength,
            List<ValidationError> errors) {
        if (value == null || !value.isString()) {
            errors.add(new ValidationError(path, "Phải là chuỗi không rỗng"));
            return null;
        }
        String text = value.stringValue().trim();
        if (text.isEmpty()) {
            errors.add(new ValidationError(path, "Không được để trống"));
            return null;
        }
        if (text.length() > maxLength) {
            errors.add(new ValidationError(path, "Không được vượt quá " + maxLength + " ký tự"));
            return null;
        }
        return text;
    }

    private String fieldPath(String parentPath, String field) {
        return parentPath.isEmpty() ? field : parentPath + "." + field;
    }
}
