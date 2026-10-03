package com.tungnq23.quiz_api.quiz;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
    long countByStatus(QuizStatus status);

    @EntityGraph(attributePaths = {"category", "createdBy"})
    @Query("select q from Quiz q where (:status is null or q.status = :status) and (:categoryId is null or q.category.id = :categoryId) and lower(q.title) like lower(:search) escape '!'")
    Page<Quiz> search(QuizStatus status, String search, Long categoryId, Pageable pageable);
}
