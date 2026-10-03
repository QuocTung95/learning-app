package com.tungnq23.quiz_api.quiz;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizVersionRepository extends JpaRepository<QuizVersion, Long> {

    Optional<QuizVersion> findByQuizIdAndStatus(Long quizId, QuizVersionStatus status);
}
