# Backend integration map

This document is based on the current Spring Boot source, not a guessed API contract.

| Screen | Method | Endpoint | Request | Response |
|---|---|---|---|---|
| Health | GET | `/api/ping` | — | `{ status: "ok" }` |
| Categories | GET | `/api/categories` | — | `Category[]` |
| Validate JSON | POST | `/api/quiz-definitions/validate` | raw JSON body | `ValidationError[]` |
| Admin create | POST | `/api/admin/quizzes` | raw JSON body | `{ quizId, versionId, status }` |
| Admin publish | POST | `/api/admin/quizzes/:quizId/publish` | — | `{ quizId, versionId, status }` |
| Public quiz | GET | `/api/quizzes/:quizId` | — | sanitized `QuizDefinition` |
| Start | POST | `/api/quizzes/:quizId/attempts` | — | `AttemptResponse` |
| Start retake | POST | `/api/retake-grants/:grantId/attempts` | — | `AttemptResponse` |
| Submit | POST | `/api/attempts/:attemptId/submit` | `{ questionId: answer }` | `AttemptResponse` |
| User result | GET | `/api/attempts/:attemptId` | — | `AttemptResultResponse` |
| Admin results | GET | `/api/admin/attempts/quiz/:quizId/results` | — | `AttemptResultResponse[]` |
| Grant retake | POST | `/api/admin/attempts/:attemptId/retake-grants` | — | numeric grant ID |

The current backend identifies the caller using the temporary `X-User-Id` header. `src/api/client.ts` adds this header only when `VITE_USER_ID` is configured. There is currently no Google OAuth endpoint, current-user endpoint, Spring Security configuration, CSRF contract, or CORS configuration in the backend source inspected on 2026-10-02. The Google button therefore stays disabled instead of pretending authentication succeeded.

The public quiz response is expected to omit `correctOptionId`, `correctOptionIds`, `acceptedAnswers`, and `correctPairs`. The frontend never calculates scores and never stores answers in localStorage.
