package com.tungnq23.quiz_api.attempt;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AttemptAnswerRepository extends JpaRepository<AttemptAnswer, Long> {

    List<AttemptAnswer> findAllByAttemptIdOrderByIdAsc(Long attemptId);
}
