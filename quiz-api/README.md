# Chạy backend và đăng nhập Google

## Điền cấu hình trực tiếp

Sửa `src/main/resources/application-oauth2.properties`:

```properties
app.oauth2.enabled=true
app.frontend.url=http://localhost:5173
spring.security.oauth2.client.registration.google.client-id=YOUR_CLIENT_ID.apps.googleusercontent.com
spring.security.oauth2.client.registration.google.client-secret=YOUR_CLIENT_SECRET
spring.security.oauth2.client.registration.google.scope=openid,profile,email
spring.security.oauth2.client.registration.google.redirect-uri=http://localhost:8080/login/oauth2/code/google
```

File cấu hình cục bộ đã có trong dự án và được bỏ qua bởi Git. Khi tạo bản checkout mới, sao chép `application-oauth2.properties.example` thành `application-oauth2.properties` trong cùng thư mục rồi điền hai giá trị của Google OAuth client loại Web application.

Trong cấu hình Google client, đặt Authorized redirect URI trùng chính xác với giá trị trong dự án: `http://localhost:8080/login/oauth2/code/google`. Nếu ứng dụng Google đang ở chế độ Testing, thêm tài khoản dùng đăng nhập vào Test users.

Thông tin Oracle được điền trong file cục bộ `src/main/resources/application-local.properties` (được Git bỏ qua). Với checkout mới, sao chép `application-local.properties.example` thành `application-local.properties`. Script yêu cầu wallet ở `../wallet_quizdb`, hoặc tại đường dẫn `ORACLE_TNS_ADMIN` bạn đặt.

## Khởi động

Từ thư mục gốc `learning-app`, chạy backend:

```bash
./quiz-api/scripts/run-local.sh
```

Mở terminal thứ hai để chạy frontend:

```bash
cd quiz-web
npm run dev
```

Mở `http://localhost:5173/login`, chọn **Tiếp tục với Google**. Khi đăng nhập thành công, backend tạo/cập nhật người dùng, lưu session và chuyển về frontend tại `/login/success`.

Profiles `local,oauth2` được chọn mặc định cả khi Run từ IDE hoặc chạy `./mvnw spring-boot:run` trong `quiz-api`. Nếu IDE hay terminal đang đặt `SPRING_PROFILES_ACTIVE` khác, bỏ giá trị đó hoặc đổi thành `local,oauth2`. Khởi động lại backend sau khi sửa cấu hình.

Kiểm tra trạng thái:

```bash
curl http://localhost:8080/api/auth/config
```

Khi bật OAuth, phản hồi có `"googleEnabled":true`. Trên trang đăng nhập, bấm **Kiểm tra lại** nếu trang vẫn hiển thị trạng thái cũ.

Để chủ động chạy backend khi chưa cấu hình Google:

```bash
./quiz-api/scripts/run-local.sh --no-oauth
```

Client Secret chỉ được đặt ở backend, không đặt vào biến `VITE_*`.

## Quyền người dùng và khu quản trị

`app_user.role_code` chỉ có `USER` và `ADMIN`: schema Oracle đã có CHECK constraint `ck_app_user_role` trong migration V1; backend dùng enum `AppRole` với cùng hai giá trị. Tài khoản Google mới mặc định là USER.

Để tạo ADMIN đầu tiên, điền email Google của bạn vào file cục bộ `src/main/resources/application-oauth2.properties`:

```properties
app.admin.bootstrap-email=your-google-email@example.com
```

Khởi động lại backend và đăng nhập bằng email đó. Chỉ tài khoản Google có email đã được xác minh mới được cấp ADMIN, và chỉ khi hệ thống chưa có ADMIN. Khi đã có admin đầu tiên, dùng màn **Người dùng & quyền** để cấp quyền cho các tài khoản đã đăng nhập. Có thể xóa giá trị bootstrap sau khi thiết lập.

ADMIN đăng nhập sẽ vào `/admin` với các màn:

- `/admin`: thống kê người dùng, admin, danh mục và bộ đề.
- `/admin/quizzes`: tìm kiếm/lọc bộ đề, xem JSON có đáp án, phát hành bản nháp và lấy link bộ đề.
- `/admin/quizzes/new`: dán JSON, mẫu đủ 5 loại câu hỏi, kiểm tra lỗi, lưu nháp và phát hành.
- `/admin/categories`: xem và thêm danh mục.
- `/admin/users`: tìm tài khoản và đổi quyền USER/ADMIN.
- `/admin/attempts`: bảng bài đã nộp, lọc theo danh mục, bộ đề, tên/email người dùng và một ngày nộp. Hỗ trợ phân trang 20/50/100 dòng và sắp xếp theo ngày nộp hoặc điểm %. Mở **Xem bài** để đối chiếu câu trả lời với đáp án và điểm từng câu theo đúng phiên bản đề đã làm.

Ngày nộp trong bộ lọc và giao diện dùng giờ Việt Nam (`Asia/Ho_Chi_Minh`). Ngày được chọn được tính trọn ngày. Danh sách chỉ bao gồm trạng thái SUBMITTED; bài đang làm hoặc hết hạn chưa nộp không xuất hiện. Điểm % giúp so sánh kết quả giữa các bộ đề có tổng điểm khác nhau.

Không được tự hạ quyền của mình. Các thay đổi quyền được kiểm tra từ database trên mỗi yêu cầu quản trị, nên có hiệu lực ngay cả với phiên đang đăng nhập. Toàn bộ API quản trị yêu cầu ADMIN; các thao tác ghi yêu cầu CSRF token. JSON có đáp án chỉ được trả qua API quản trị, còn API công khai loại bỏ đáp án.

Mỗi bộ đề chứa một mảng `questions`; hiện dự án quản lý câu hỏi trong bộ đề, chưa có ngân hàng câu hỏi độc lập.

Hướng dẫn triển khai FE + BE cùng URL miễn phí: [Deploy trên Render](../deploy/README.md).
