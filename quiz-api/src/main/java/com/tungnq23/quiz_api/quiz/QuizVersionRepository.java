package com.tungnq23.quiz_api.quiz;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface QuizVersionRepository extends JpaRepository<QuizVersion, Long> {

    Optional<QuizVersion> findByQuizIdAndStatus(Long quizId, QuizVersionStatus status);

    @EntityGraph(attributePaths = {"quiz", "quiz.category"})
    @Query("select v from QuizVersion v join v.quiz q where v.status = com.tungnq23.quiz_api.quiz.QuizVersionStatus.ACTIVE and q.status = com.tungnq23.quiz_api.quiz.QuizStatus.ACTIVE and (:categoryId is null or q.category.id = :categoryId) and lower(q.title) like lower(:search) escape '!'")
    Page<QuizVersion> searchPublic(Long categoryId, String search, Pageable pageable);
}
