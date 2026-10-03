# Quiz App — Codex handoff hiện trạng

Cập nhật: 2026-10-03 — nối Google login/session, bỏ X-User-Id và thêm category ENGLISH

Đây là source of truth cho các phiên làm việc tiếp theo. Các quyết định cốt lõi bên dưới đã được chốt; không tự ý thay đổi. Trước khi sửa code, luôn đọc file thực tế trong workspace vì tài liệu có thể lỗi thời.

## 1. Mục tiêu và cách cộng tác

Xây dựng ứng dụng tạo và làm bài kiểm tra trực tuyến, đồng thời học backend Java Spring Boot theo từng bước nhỏ.

- Admin dán JSON do AI tạo để tạo bộ đề, quản lý bộ đề, kết quả và quyền làm lại.
- User mở link, đăng nhập, làm bài trong thời gian giới hạn, submit và xem kết quả.
- Gửi kết quả qua email là mục tiêu sau, chưa triển khai.

Người dùng muốn hiểu từng bước, nhưng yêu cầu mới nhất cho phép chủ động hoàn thiện một luồng sử dụng hợp lý trước khi hỏi. Giải thích thay đổi; tự xử lý lỗi và thiếu sót trong phạm vi hiện có. Chỉ hỏi các quyết định nghiệp vụ hoặc vận hành thực sự chưa thể suy ra; không triển khai toàn bộ roadmap trong một lần.

## 2. Workspace và công nghệ

- Workspace Mac hiện tại: `/Users/macbook/Documents/learning-app`
- Backend: `quiz-api`
- Package Java thực tế: `com.tungnq23.quiz_api`
- Spring Boot: `4.1.1`
- Java: `17` trong Maven compiler configuration
- Build: Maven Wrapper (`./mvnw` trên Mac; đã cấp quyền executable)
- Persistence hiện có: Spring Data JPA/Hibernate và Oracle JDBC
- Database: Oracle Autonomous Database, schema user `tungnq23`
- Migration: Flyway
- Frontend đã có: `quiz-web`, Vite + React + TypeScript + Ant Design + TanStack Query
- Hosting dự kiến: Oracle Cloud Always Free
- Local development hiện tại không cần Docker

Không giả định Codex đã nhìn thấy file local ở phiên trước. Luôn kiểm tra source, migration và cấu hình thực tế trước khi thay đổi.

Lưu ý bảo mật: `application.properties` từng chứa password DB trực tiếp. Trước khi đưa code vào source control, chuyển sang biến môi trường `DB_PASSWORD`; không commit password, wallet hoặc secret.

## 3. Database và migration — quyết định không được phá vỡ

Nguồn migration chính thức đã được người dùng xác nhận là `flyway/migrations` **ở gốc workspace**. V1 đã được áp dụng và validate thành công trên schema `TUNGNQ23`. Ngày 2026-10-03 đã chạy `info` (V1 Success, V2 Pending), validate trước migrate với `-ignoreMigrationPatterns=versioned:pending`, rồi áp dụng V2 thành công; schema đã lên version 2. Sau đó V3 seed ENGLISH đã áp dụng thành công (1 row created), schema hiện ở version 3.

`quiz-api/flyway/migrations` là bản copy thiếu V1; không dùng thư mục này để migrate và không tự tạo lại V1. Hai bản V2 khác định dạng; không chỉnh SQL đã áp dụng để đồng bộ bản copy.

- Không sửa nội dung V1 hoặc chạy lại V1.
- V2 thêm google_subject và V3 seed ENGLISH đã áp dụng. Migration mới tiếp theo dùng V4+; không sửa V1/V2/V3 đã chạy. V3 dùng MERGE chỉ insert khi code ENGLISH chưa tồn tại, không ghi đè category cũ.
- Không tự tạo lại các bảng đã có trong V1.
- Hãy đọc SQL V1 thực tế để map entity; tài liệu này không thay thế migration.

V1 có 7 bảng:

| Bảng | Vai trò |
|---|---|
| `CATEGORY` | Lĩnh vực của quiz |
| `APP_USER` | User/admin của ứng dụng, khác Oracle DB user |
| `QUIZ` | Bộ đề ở cấp quản lý |
| `QUIZ_VERSION` | Snapshot nội dung và format của một phiên bản |
| `ATTEMPT` | Một lượt user bắt đầu/làm/nộp bài |
| `ATTEMPT_ANSWER` | Câu trả lời và điểm từng câu sau submit |
| `RETAKE_GRANT` | Quyền làm lại do admin cấp |

### Quyết định lưu nội dung câu hỏi

Không có bảng vật lý `QUESTION`, `OPTION`, `QUESTION_ANSWER` trong V1. Toàn bộ definition JSON, gồm câu hỏi, options, answer key và điểm, được lưu trong `QUIZ_VERSION.content_json` kiểu CLOB. `QUIZ` chỉ lưu metadata; `QUIZ_VERSION` lưu snapshot nội dung từng phiên bản.

Không tự ý thêm các bảng `quiz_question`, `question_option`, `question_correct_option`, `question_accepted_answer` hoặc `question_matching_pair` chỉ vì muốn map theo kiểu JPA truyền thống.

Hệ quả: khi submit, service Java phải kiểm tra question ID, option ID và matching ID dựa trên `content_json` của attempt. API trả đề cho user phải loại bỏ answer key.

## 4. Quy tắc nghiệp vụ đã chốt

### Tạo và phát hành đề

1. Admin gửi JSON chứa metadata, câu hỏi, options và đáp án.
2. Backend validate syntax, cấu trúc, loại câu hỏi và ID tham chiếu.
3. Backend tìm `CATEGORY` theo `categoryCode`.
4. Lưu metadata vào `QUIZ`, nội dung JSON vào version đầu tiên trong `QUIZ_VERSION`.
5. Lưu `QUIZ` và `QUIZ_VERSION` trong transaction; lỗi một phần không để lại dữ liệu dở dang.
6. Trạng thái đề dùng draft/active/archived theo schema thực tế; không suy diễn rằng tạo xong là user làm được.
7. Version đã publish hoặc đã có attempt không được âm thầm sửa; thay đổi nội dung phải tạo version mới.

### User làm bài

- Khi bắt đầu, server tạo `ATTEMPT`, cố định `quiz_version_id`, `started_at` và tính `expires_at`.
- Frontend hiển thị đồng hồ dựa trên hạn server trả về; server quyết định còn hạn hay không.
- Không autosave câu trả lời từng câu.
- Chỉ khi submit thành công mới ghi `ATTEMPT_ANSWER`, chấm điểm và cập nhật tổng điểm.
- Đóng trình duyệt trước khi submit nghĩa là server không có câu trả lời chưa submit để khôi phục.
- Xử lý mất mạng, request quá hạn và auto-submit khi hết giờ phải được thiết kế riêng.

### Làm lại

- Mỗi user có một lượt đầu tiên cho mỗi `QUIZ`.
- Lượt sau cần `RETAKE_GRANT` cụ thể do admin cấp.
- Một grant chỉ dùng cho một attempt mới; attempt và điểm cũ giữ nguyên.
- Grant xuất phát từ một attempt và nhắm tới đúng `QUIZ_VERSION` của attempt đó.
- Không dùng cờ `canRetake = true` vĩnh viễn trên user.

## 5. JSON contract v1

Các field chung: `schemaVersion`, `categoryCode`, `title`, `description`, `durationMinutes`, `questions`. Mỗi câu hỏi có `id`, `type`, `prompt`, `points`.

| Type | Field riêng | Cách chấm v1 |
|---|---|---|
| `single_choice` | `options[{id,text}]`, `correctOptionId` | Chọn đúng nhận đủ điểm |
| `dropdown` | Như single choice | Tương tự single choice, khác UI |
| `multiple_choice` | `options[{id,text}]`, `correctOptionIds[]` | Tập lựa chọn phải khớp chính xác; đúng đủ điểm, sai 0 |
| `short_answer` | `acceptedAnswers[]` | Chuẩn hóa khoảng trắng, không phân biệt hoa thường, giữ dấu |
| `matching` | `left[]`, `right[]`, `correctPairs[]` | Mỗi cặp đúng nhận 1 điểm; `points` bằng số phần tử bên trái |

ID câu hỏi duy nhất trong version. Option ID và ID mỗi bên matching duy nhất trong câu hỏi. Câu bỏ trống được 0 điểm. `content_json` có answer key và chỉ dành cho backend/admin; user không nhận đáp án đúng trước submit.

## 6. Code đã có và trạng thái hiện tại

### Category

Đã có `CategoryController`, `CategoryService`, `CategoryRepository`, `CategoryMapper`, `CategoryDto` và các API:

- `GET /api/categories`
- `POST /api/categories`

API tạo category nhận `code`, `name`, không nhận `id`; trim, chuẩn hóa code uppercase, validate độ dài, trả `201`, `400` hoặc `409` phù hợp.

Lưu ý: handoff cũ ghi category dùng `JdbcTemplate`, nhưng source hiện tại là nguồn sự thật khi kiểm tra. Không trộn hai cách truy cập dữ liệu nếu chưa có chủ đích.

### Quiz definition validation

Đã có:

- `definition/QuizDefinitionValidator.java`
- `definition/ValidationError.java`
- `definition/QuizDefinitionController.java`
- `POST /api/quiz-definitions/validate`
- Unit tests cho `single_choice` và `multiple_choice`

API nhận raw JSON và trả trực tiếp danh sách lỗi. JSON hợp lệ trả `[]`. Validator hiện đã bao phủ cả 5 type: single_choice, multiple_choice, dropdown, short_answer và matching. Có 9 unit test validator; coverage semantic/biên vẫn cần mở rộng, không coi đó là đầy đủ mọi tình huống.

### Quiz, publish và attempt hiện có

Đã map JPA cho `APP_USER`, `QUIZ`, `QUIZ_VERSION`, `ATTEMPT`, `ATTEMPT_ANSWER` và `RETAKE_GRANT` theo V1. Đã có các API v1:

- `POST /api/admin/quizzes` với session Google và quyền ADMIN: validate JSON, yêu cầu user `ADMIN`, lưu quiz/version transaction.
- `POST /api/admin/quizzes/{quizId}/publish`: publish draft version của creator.
- `GET /api/quizzes/{quizId}`: chỉ trả version active và loại answer key.
- `POST /api/quizzes/{quizId}/attempts` với user từ session Google: tạo initial attempt, server tính deadline.
- `POST /api/retake-grants/{grantId}/attempts` với user từ session Google: bắt đầu attempt từ grant.
- `POST /api/attempts/{attemptId}/submit` với user từ session Google: submit một lần, chấm và ghi answers trong transaction.
- `POST /api/admin/attempts/{attemptId}/retake-grants` với user từ session Google: admin cấp grant.
- `GET /api/attempts/{attemptId}` với user từ session Google: user xem attempt/result của chính mình; chuyển IN_PROGRESS quá hạn thành EXPIRED và lưu trạng thái.
- `GET /api/attempts/{attemptId}/definition` với user từ session Google: trả đúng snapshot quiz_version của attempt, kiểm tra owner và loại toàn bộ answer key, không phụ thuộc version đang ACTIVE.
- `GET /api/admin/attempts/quiz/{quizId}/results` với user từ session Google: admin xem các attempt của quiz.

Submit tại hoặc sau `expiresAt` trả response trạng thái `EXPIRED`, commit trạng thái và không ghi answer. Trước đây code throw RuntimeException sau expire nên transaction rollback; đã sửa. Submit đúng hạn chuyển sang `SUBMITTED` và ghi answer trong cùng transaction.

Submit và đọc trạng thái attempt sử dụng pessimistic write lock để tránh hai submit đồng thời hoặc expire ghi đè trạng thái đã submit. Test concurrency trên H2 đã được bổ sung; chưa thay thế kiểm thử concurrency Oracle. Matching chấm từng cặp đúng 1 điểm, cho phép trả lời một phần; payload malformed hoặc lặp leftId được 0 điểm cho câu matching. Short answer chuẩn hóa bằng Locale.ROOT.

Retake chỉ được cấp từ attempt `SUBMITTED`, grant chỉ được dùng bởi user của source attempt và chỉ dùng một lần. Scoring malformed matching response được coi là sai, không làm hỏng request bằng lỗi null.

Test context dùng H2 in-memory chỉ trong test scope để kiểm tra Spring/JPA mapping mà không cần Oracle credential. Production vẫn dùng Oracle và `DB_PASSWORD`.

`X-User-Id` đã bị loại khỏi controller và frontend. CurrentAppUser xác định APP_USER từ OIDC principal.google_subject; admin API kiểm tra role trong database. Header X-User-Id gửi lên bị bỏ qua. Đọc category/quiz ACTIVE cho phép anonymous; attempt/result yêu cầu session. Create category và validate definition yêu cầu ADMIN.

API anonymous trả 401 thay vì redirect HTML sang Google; POST yêu cầu CSRF. Frontend lấy token tại GET /api/auth/csrf trước mỗi mutation. Logout là POST /api/auth/logout có CSRF, xóa session/cookie. Khi OAuth tắt, API riêng vẫn yêu cầu authentication; không còn development header bypass.

`DatabaseCheckController` đã được xóa khỏi source. Password không còn nằm trong `application.properties`; cần cấu hình `DB_PASSWORD` và tùy chọn `ORACLE_TNS_ADMIN` trong môi trường chạy. Test context hiện dùng H2; nếu thấy `ORA-01017` trong test, kiểm tra profile/datasource override trước. Khi chạy backend Oracle, kiểm tra DB_PASSWORD và tài khoản; không đưa password trở lại source.

### Endpoint chẩn đoán

`GET /api/ping` còn trong source. `DatabaseCheckController` và `/api/db-check` đã bị xóa; không khôi phục endpoint trả thông tin DB nhạy cảm.

## 7. Bước tiếp theo, theo thứ tự

1. Hoàn tất kiểm thử Google thực sau khi người dùng đổi Client Secret và nhập trong Terminal.
2. Chốt bootstrap admin và chính sách hết giờ/mất mạng (mục 10); authentication/session/CSRF/frontend login đã có code và HTTP tests.
3. Thêm UI quản lý kết quả/cấp grant/start retake; API backend đã tồn tại.
4. Thống nhất status/error contract (hiện nhiều lỗi nghiệp vụ đều trả 400), giới hạn JSON/số câu và test API HTTP.
5. Kiểm thử với Oracle về transaction/concurrency, luồng OAuth thực và callback.
6. Sau đó mới mở rộng catalogue, version editing, email kết quả và deploy.

Giữ các bước nhỏ, có test/build và tài liệu kiểm thử. Không đổi schema/auth policy khi chưa có thông tin cần thiết.

## 8. Quy tắc cộng tác

- Trước khi sửa, nói rõ đang làm bước nào, dữ liệu đi từ đâu đến đâu và vì sao cần lớp đó.
- Giải thích liên hệ với NestJS khi hữu ích: Controller ↔ Controller, Service ↔ Service, Repository/JPA ↔ data access.
- Chủ động sửa lỗi và hoàn thiện luồng hiện có theo yêu cầu mới nhất; hỏi khi cần quyết định nghiệp vụ mới.
- Phân biệt rõ quyết định đã chốt, đề xuất và code thực sự đã có.
- Không sửa migration đã áp dụng, không tự thêm bảng câu hỏi; Google OAuth đã được chọn, nhưng policy truy cập/admin còn cần chốt.
- Không đưa password Oracle, wallet hoặc answer key vào response user.
- Sau mỗi thay đổi phải hướng dẫn cách test; không tuyên bố hoàn thành nếu chưa kiểm tra code/build/test.

## 9. Phạm vi có code và giới hạn kiểm chứng

Backend có validate definition, tạo draft, publish, public read không answer key, start/submit/scoring, expire, result và retake grant. Frontend có category, mở quiz bằng link, start, làm bài 5 type, submit/result và create → publish → copy link.

Đã thêm integration test H2 cho attempt/scoring/expire/snapshot/rollback/concurrent submit. Không coi build/context test là bằng chứng đã kiểm thử toàn bộ UI, Oracle hoặc Google OAuth end-to-end.

## 10. Quyết định cần người dùng chốt

1. **Ai được làm bài?** Mọi tài khoản Google có link, hay chỉ email được mời? Luồng hiện tại mặc định mọi Google account có email verified được tạo USER; chưa có invitation/allowlist. Có thể siết sau nếu người dùng yêu cầu.
2. **Admin đầu tiên và quản lý quyền:** tài khoản/email nào là admin đầu tiên? Code tự tạo USER; chưa có bootstrap admin hoặc UI quản lý quyền. Không tự cấp ADMIN cho người đăng nhập đầu tiên.
3. **Hết giờ/mất mạng:** giữ chính sách strict hiện tại (request tới server trước deadline mới được chấm, quá hạn EXPIRED), hay muốn browser tự gửi khi hết giờ và quy định grace period? Vì không autosave, server không thể tự chấm câu trả lời chưa từng nhận. Hiện frontend chưa auto-submit; mất mạng vẫn giữ câu trả lời trong bộ nhớ trang để retry khi còn hạn.

Các hạng mục hoãn, không cần hỏi để dùng thử luồng v1: catalogue quiz, gửi email/chống gửi trùng, edit/version mới, hosting và giới hạn quy mô production.

## 11. Google OAuth2 và session

- Backend có Spring Security OAuth2 Client, GoogleOidcUserService và CurrentAppUser.
- Google login xác minh subject/email verified, tự tạo USER lần đầu, tái sử dụng user theo google_subject lần sau. Cho phép link email verified với user cũ chưa có subject; không relink email đã gắn subject khác. Không tự cấp ADMIN.
- GET /api/me trả id, email, displayName, roleCode của APP_USER.
- OAuth mặc định tắt; profile oauth2 dùng application-oauth2.properties. Client ID đã có default public khớp dự án người dùng; Client Secret chỉ lấy từ GOOGLE_CLIENT_SECRET.
- Callback cố định http://localhost:8080/login/oauth2/code/google. Thành công về http://localhost:5173/login/success, lỗi về /login?error=google. APP_FRONTEND_URL có thể đổi frontend URL.
- Vite proxy /api và /oauth2 tới backend 8080; strictPort 5173 để không âm thầm đổi port. Dùng cùng hostname localhost cho cả frontend/backend; không trộn 127.0.0.1 với localhost.
- Frontend có nút Đăng nhập / Đăng ký, nút Tiếp tục với Google, tên/role thật từ /api/me, route guard và logout. Không còn VITE_USER_ID/VITE_USER_ROLE.
- Redirect sau login trở về link quiz/attempt trước đó bằng sessionStorage chỉ cho path local. Không lưu token/secret hay autosave answers vào browser storage.
- POST dùng session + CSRF, lấy token qua /api/auth/csrf. GET /api/auth/config thông báo googleEnabled để UI không giả vờ OAuth đang bật khi server chưa cấu hình.
- Secret từng được người dùng gửi trong chat; đã yêu cầu rotate. Người dùng xác nhận chưa đổi và sẽ đổi trong Google Cloud. Không dùng lại secret đó; không đọc/in file Google secret.
- Script quiz-api/scripts/run-local.sh mặc định bật profile oauth2, lấy DB_PASSWORD từ env hoặc Flyway local config; Google secret chỉ từ env hoặc prompt kín trong Terminal, không lưu file. Không chạy script dưới shell tracing.
- Callback/token exchange với Google thực và GET /api/me sau Google thật còn chờ secret mới và người dùng chọn tài khoản trong trình duyệt.

## 12. Frontend và luồng sử dụng

- Mở http://localhost:5173 → Đăng nhập / Đăng ký → Tiếp tục với Google. Lần đầu tạo USER tự động, không cần form mật khẩu riêng.
- Category ENGLISH đã có trong Oracle (id 1, code ENGLISH, name English), public GET category không yêu cầu login.
- Admin đăng nhập bằng tài khoản APP_USER có role ADMIN → /admin/quizzes/new → validate JSON → create draft → publish → copy link /quizzes/{quizId}. Admin đầu tiên chưa được bootstrap trong lần này.
- User mở link → đăng nhập nếu cần → start → làm bài → submit → result.
- Attempt lấy /api/attempts/{id}/definition để giữ đúng snapshot, kể cả retake phiên bản cũ.
- Trạng thái được polling mỗi 5 giây khi IN_PROGRESS; server lưu EXPIRED khi user đọc/submit quá hạn. Không có background job expire mọi attempt.
- Lỗi submit hiển thị rõ và giữ câu trả lời trên trang để retry; invalidate cache kết quả trước điều hướng.
- Reload/đóng trang mất câu trả lời chưa submit; không thêm autosave.
- UI kết nối chỉ báo thành công khi category request thành công; không báo category rỗng nếu API đang lỗi. Dùng Ant Design darkAlgorithm để alert dễ đọc trên nền tối.
- UI admin results/retake chưa có dù client/backend đã có các API tương ứng.

## 13. Mac local và kiểm tra môi trường

Homebrew đã update, nhưng cài openjdk@17 từ source quá lâu trên macOS 14; người dùng chọn chuyển sang bộ cài chính thức. Tiến trình brew install openjdk@17 đã được dừng. brew install flyway trước đó lỗi khóa dependency nên không coi Homebrew đã cài hai công cụ.

Đã tải và kiểm tra checksum Temurin/Redgate, giải nén vào:

- Java: ~/.local/opt/jdk-17.0.20.1+1/Contents/Home (Java 17.0.20.1)
- Flyway: ~/.local/opt/flyway-13.9.0, executable ~/.local/bin/flyway (13.9.0)
- Wallet: ~/secrets/quizdb-wallet, quyền thư mục 700/file 600; có quizdb_low và các file wallet. Đã chuyển ra khỏi workspace.
- Flyway local config: flyway/conf/flyway.toml, đã sửa TNS_ADMIN Windows sang /Users/macbook/secrets/quizdb-wallet; password local không hiển thị và không đưa vào tài liệu/Git.
- Root .gitignore bảo vệ wallet, flyway.toml, .env và client_secret*.json.
- Workspace hiện chưa có .git; không coi .gitignore là bằng chứng đã xóa secret khỏi lịch sử Git ở nguồn khác.

Trong terminal Mac:

```bash
export JAVA_HOME="$HOME/.local/opt/jdk-17.0.20.1+1/Contents/Home"
export PATH="$JAVA_HOME/bin:$HOME/.local/bin:$PATH"
export ORACLE_TNS_ADMIN="$HOME/secrets/quizdb-wallet"
export TNS_ADMIN="$ORACLE_TNS_ADMIN"
```

Flyway cần chỉ rõ config; chạy ở thư mục gốc flyway:

```bash
cd /Users/macbook/Documents/learning-app/flyway
flyway -configFiles=conf/flyway.toml -environment=default info
flyway -configFiles=conf/flyway.toml -environment=default validate
```

Trước migrate có version mới pending, validate với -ignoreMigrationPatterns=versioned:pending; không ignore missing/checksum mismatch và không repair để che lỗi. V1/V2/V3 đã áp dụng không chạy lại. Trong sandbox DNS Oracle bị chặn; lệnh ngoài sandbox trước đó đã kết nối thành công Oracle 23, schema TUNGNQ23.

Backend dùng DB_PASSWORD qua biến môi trường. OAuth cần GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET và profile oauth2; không đọc/in secret hoặc yêu cầu gửi secret trong chat. Đã xác nhận backend khởi động Java 17, validate JPA schema và kết nối Oracle bằng wallet. GET /api/me qua Google thật vẫn chờ secret mới.

Kiểm chứng ngày 2026-10-03 trước rà soát này: ./mvnw test trên Java 17 — 10 test, BUILD SUCCESS; npm install thành công; npm run build thành công, warning chunk >500 kB; Vite từng khởi động ở 127.0.0.1:5173 và trả HTTP 200.

## 14. Kiểm chứng sau sửa luồng

- Với JAVA_HOME Temurin 17: `cd quiz-api && ./mvnw -B test` — 18 tests, 0 failure/error/skipped, BUILD SUCCESS (10 test cũ + 8 integration test mới).
- `cd quiz-web && npm run build` — TypeScript + Vite thành công; còn warning bundle >500 kB, chưa tối ưu code splitting.
- Test mới dùng H2 in-memory, không ghi dữ liệu kiểm thử vào Oracle.
- Chưa chạy browser end-to-end cho UI publish/attempt mới, chưa kiểm thử Google login hoặc /api/me bằng session thực.
- Các thay đổi lần này không thêm/sửa migration hay cấu hình secret.

## 15. Kiểm chứng Google/session và ENGLISH

- `./mvnw -B test` trên Java 17 — 29 test, 0 failure/error/skipped, BUILD SUCCESS (18 test trước + 11 GoogleSessionTests).
- GoogleSessionTests dùng H2 và synthetic OIDC identity, không gọi Google hoặc ghi user test vào Oracle. Bao phủ anonymous 401, header spoof bị bỏ qua, owner, role/admin, token CSRF thật từ endpoint, logout, provisioning lặp, email unverified và chống relink subject khác. Không coi các test này là Google login thật.
- `npm run build` — TypeScript/Vite thành công, còn warning chunk >500 kB.
- Flyway info trước V3: V1/V2 Success, V3 Pending; validate thành công; migrate áp dụng V3 thành công và thêm 1 row. Kiểm tra sau migrate: V1/V2/V3 đều Success, validate thành công 3 migrations.
- `./scripts/run-local.sh --no-oauth` đã khởi động backend với Oracle, Hikari kết nối và Hibernate validate schema thành công; dùng chế độ này chỉ để chẩn đoán khi chưa có Google secret mới.
- HTTP backend `/api/categories` và proxy `http://localhost:5173/api/categories` trả `[ENGLISH]` từ Oracle; `/api/me` anonymous trả 401; `/api/auth/config` báo googleEnabled=false đúng với chế độ chẩn đoán; /login trên Vite trả 200.
- Backend chẩn đoán do Codex khởi động đã được dừng sau kiểm tra để giải phóng cổng 8080 cho run-local.sh với OAuth.
- Browser skill đã được thử, runtime báo No browser is available và danh sách browser rỗng. Chưa kiểm tra trực quan bằng browser automation hay thực hiện Google consent.

Sau khi đổi secret, mở Terminal:

```bash
cd /Users/macbook/Documents/learning-app/quiz-api
./scripts/run-local.sh
```

Script yêu cầu nhập Google Client Secret mới kín trong Terminal. Frontend chạy riêng bằng `cd quiz-web && npm run dev`; mở **http://localhost:5173** và bấm Google. Không gửi secret/mật khẩu Gmail vào chat.
