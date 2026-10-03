package com.tungnq23.quiz_api.attempt;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.tungnq23.quiz_api.category.Category;
import com.tungnq23.quiz_api.category.CategoryRepository;
import com.tungnq23.quiz_api.quiz.*;
import com.tungnq23.quiz_api.user.*;

@SpringBootTest(properties = {
        "spring.profiles.active=test",
        "spring.datasource.url=jdbc:h2:mem:attempt-flow;MODE=Oracle;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "app.oauth2.enabled=false"
})
class AttemptFlowTests {
    @Autowired AttemptService service;
    @Autowired AttemptRepository attempts;
    @Autowired AttemptAnswerRepository answers;
    @Autowired AppUserRepository users;
    @Autowired CategoryRepository categories;
    @Autowired QuizRepository quizzes;
    @Autowired QuizVersionRepository versions;

    @Test
    void gradesAllFiveTypesAndPartialMatching() {
        Fixture f = fixture(false);
        AttemptResponse result = service.submit(f.attemptId(), f.userId(), """
                {"single":"a","dropdown":"a","multiple":["b","a"],
                 "short":"  XIN   Chào  ","matching":[{"leftId":"l1","rightId":"r1"}]}
                """);
        assertEquals(AttemptStatus.SUBMITTED, result.status());
        assertEquals(0, new BigDecimal("5").compareTo(result.totalScore()));
        assertEquals(5, answers.findAllByAttemptIdOrderByIdAsc(f.attemptId()).size());
    }

    @Test
    void duplicateMatchingLeftCannotEarnPoints() {
        Fixture f = fixture(false);
        AttemptResponse result = service.submit(f.attemptId(), f.userId(), """
                {"matching":[{"leftId":"l1","rightId":"r1"},{"leftId":"l1","rightId":"r1"}]}
                """);
        assertEquals(0, BigDecimal.ZERO.compareTo(result.totalScore()));
    }

    @Test
    void malformedMatchingDoesNotCrashSubmit() {
        Fixture f = fixture(false);
        assertEquals(AttemptStatus.SUBMITTED,
                service.submit(f.attemptId(), f.userId(), "{\"matching\":[null]}").status());
    }

    @Test
    void expiredSubmitCommitsStatusAndWritesNoAnswers() {
        Fixture f = fixture(true);
        assertEquals(AttemptStatus.EXPIRED,
                service.submit(f.attemptId(), f.userId(), "{\"single\":\"a\"}").status());
        assertEquals(AttemptStatus.EXPIRED, attempts.findById(f.attemptId()).orElseThrow().getStatus());
        assertTrue(answers.findAllByAttemptIdOrderByIdAsc(f.attemptId()).isEmpty());
    }

    @Test
    void readingAnElapsedAttemptCommitsExpiredStatus() {
        Fixture f = fixture(true);
        assertEquals(AttemptStatus.EXPIRED, service.getResult(f.attemptId(), f.userId()).status());
        assertEquals(AttemptStatus.EXPIRED, attempts.findById(f.attemptId()).orElseThrow().getStatus());
    }

    @Test
    void snapshotIsAvailableWithoutAnActiveVersionAndHasNoAnswerKeys() {
        Fixture f = fixture(false);
        var definition = service.getDefinition(f.attemptId(), f.userId());
        assertEquals("Snapshot", definition.get("title").stringValue());
        for (var question : definition.get("questions")) {
            for (String key : new String[]{"correctOptionId", "correctOptionIds", "acceptedAnswers", "correctPairs"}) {
                assertFalse(question.has(key));
            }
        }
        assertTrue(versions.findById(f.versionId()).orElseThrow().getContentJson().contains("correctPairs"));
        assertThrows(AttemptException.class, () -> service.getDefinition(f.attemptId(), -1L));
    }

    @Test
    void unknownQuestionRollsBackAllAnswerWrites() {
        Fixture f = fixture(false);
        assertThrows(AttemptException.class,
                () -> service.submit(f.attemptId(), f.userId(), "{\"single\":\"a\",\"unknown\":\"x\"}"));
        assertTrue(answers.findAllByAttemptIdOrderByIdAsc(f.attemptId()).isEmpty());
        assertEquals(AttemptStatus.IN_PROGRESS, attempts.findById(f.attemptId()).orElseThrow().getStatus());
    }

    @Test
    void concurrentSubmitsWriteAnswersOnlyOnce() throws Exception {
        Fixture f = fixture(false);
        var executor = Executors.newFixedThreadPool(2);
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        java.util.concurrent.Callable<Boolean> submit = () -> {
            ready.countDown();
            assertTrue(start.await(10, TimeUnit.SECONDS));
            try {
                service.submit(f.attemptId(), f.userId(), "{\"single\":\"a\"}");
                return true;
            } catch (AttemptException expected) {
                return false;
            }
        };
        try {
            var first = executor.submit(submit);
            var second = executor.submit(submit);
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            assertNotEquals(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS));
            assertEquals(1, answers.findAllByAttemptIdOrderByIdAsc(f.attemptId()).size());
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }

    private Fixture fixture(boolean expired) {
        String suffix = UUID.randomUUID().toString();
        AppUser user = users.save(AppUser.fromGoogle(suffix, suffix + "@example.test", "Test"));
        Category category = categories.save(Category.create(suffix, "Test"));
        Quiz quiz = quizzes.save(new Quiz(category, user, "Snapshot"));
        QuizVersion version = versions.save(new QuizVersion(quiz, 1, 10, DEFINITION));
        OffsetDateTime now = OffsetDateTime.now();
        Attempt attempt = attempts.save(new Attempt(user, quiz, version, now.minusMinutes(2),
                expired ? now.minusMinutes(1) : now.plusMinutes(10), new BigDecimal("6")));
        return new Fixture(user.getId(), attempt.getId(), version.getId());
    }

    private record Fixture(Long userId, Long attemptId, Long versionId) {}

    private static final String DEFINITION = """
            {"schemaVersion":1,"categoryCode":"TEST","title":"Snapshot","durationMinutes":10,
             "questions":[
               {"id":"single","type":"single_choice","prompt":"S","points":1,"options":[{"id":"a","text":"A"}],"correctOptionId":"a"},
               {"id":"dropdown","type":"dropdown","prompt":"D","points":1,"options":[{"id":"a","text":"A"}],"correctOptionId":"a"},
               {"id":"multiple","type":"multiple_choice","prompt":"M","points":1,"options":[{"id":"a","text":"A"},{"id":"b","text":"B"}],"correctOptionIds":["a","b"]},
               {"id":"short","type":"short_answer","prompt":"T","points":1,"acceptedAnswers":["Xin chào"]},
               {"id":"matching","type":"matching","prompt":"P","points":2,"left":[{"id":"l1","text":"L1"},{"id":"l2","text":"L2"}],"right":[{"id":"r1","text":"R1"},{"id":"r2","text":"R2"}],"correctPairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"}]}
             ]}
            """;
}
