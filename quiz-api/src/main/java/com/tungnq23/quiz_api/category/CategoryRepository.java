package com.tungnq23.quiz_api.category;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findAllByOrderByNameAscCodeAsc();

    boolean existsByCode(String code);

    Optional<Category> findByCode(String code);
}
