package com.tungnq23.quiz_api.user;

import java.time.OffsetDateTime;
import java.util.Locale;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;

@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "display_name", length = 150)
    private String displayName;

    @Column(name = "google_subject", unique = true, length = 255)
    private String googleSubject;

    @Column(name = "role_code", nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private AppRole roleCode;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected AppUser() {
    }

    public static AppUser fromGoogle(String subject, String email, String displayName) {
        AppUser user = new AppUser();
        user.googleSubject = subject;
        user.email = email.toLowerCase(Locale.ROOT);
        user.displayName = displayName;
        user.roleCode = AppRole.USER;
        user.createdAt = OffsetDateTime.now();
        return user;
    }

    public void updateGoogleProfile(String email, String displayName) {
        this.email = email.toLowerCase(Locale.ROOT);
        this.displayName = displayName;
    }

    public void linkGoogleSubject(String subject) {
        this.googleSubject = subject;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getGoogleSubject() {
        return googleSubject;
    }

    public String getRoleCode() {
        return roleCode.name();
    }

    public void changeRole(AppRole role) {
        this.roleCode = java.util.Objects.requireNonNull(role);
    }
}
