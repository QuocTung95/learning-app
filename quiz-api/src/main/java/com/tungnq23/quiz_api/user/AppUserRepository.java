package com.tungnq23.quiz_api.user;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByGoogleSubject(String googleSubject);

    Optional<AppUser> findByEmail(String email);

    long countByRoleCode(AppRole role);

    @Query("select u from AppUser u where lower(u.email) like lower(:q) escape '!' or lower(u.displayName) like lower(:q) escape '!'")
    Page<AppUser> search(String q, Pageable pageable);

    // Serialize role changes so two admins cannot demote one another concurrently.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AppUser> findFirstByOrderByIdAsc();
}
