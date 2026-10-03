package com.tungnq23.quiz_api.attempt;

import java.util.Optional;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AttemptRepository extends JpaRepository<Attempt, Long>, JpaSpecificationExecutor<Attempt> {

    long countByStatus(AttemptStatus status);

    @Override
    @EntityGraph(attributePaths = {"user", "quiz", "quiz.category"})
    Page<Attempt> findAll(Specification<Attempt> specification, Pageable pageable);

    boolean existsByUserIdAndQuizIdAndRetakeGrantIdIsNull(Long userId, Long quizId);

    Optional<Attempt> findByIdAndUserId(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Attempt> findLockedByIdAndUserId(Long id, Long userId);

    Optional<Attempt> findByRetakeGrantId(Long retakeGrantId);

    List<Attempt> findAllByQuizIdOrderByStartedAtDesc(Long quizId);
}
