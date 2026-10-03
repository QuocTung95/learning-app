package com.tungnq23.quiz_api.quiz;

import java.time.OffsetDateTime;

import com.tungnq23.quiz_api.category.Category;
import com.tungnq23.quiz_api.user.AppUser;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "quiz")
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private AppUser createdBy;

    @Column(nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private QuizStatus status;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Quiz() {
    }

    public Quiz(Category category, AppUser createdBy, String title) {
        this.category = category;
        this.createdBy = createdBy;
        this.title = title;
        this.status = QuizStatus.DRAFT;
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Category getCategory() {
        return category;
    }

    public AppUser getCreatedBy() {
        return createdBy;
    }

    public String getTitle() {
        return title;
    }

    public QuizStatus getStatus() {
        return status;
    }

    public void activate() {
        this.status = QuizStatus.ACTIVE;
    }
}
