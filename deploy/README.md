# Deploy Quizz App miễn phí trên Render

Cách này đóng gói React và Spring Boot vào một Docker Web Service. Spring Boot phục vụ cả giao diện, `/api` và Google OAuth trên cùng một URL HTTPS. Bạn tiếp tục dùng database Oracle hiện tại, không cần tạo database khác.

Render có Web Service miễn phí và hỗ trợ Docker. Dịch vụ miễn phí ngủ sau 15 phút không có truy cập, lần mở tiếp theo có thể mất khoảng một phút để khởi động. Session đăng nhập đang lưu trong bộ nhớ sẽ mất khi backend khởi động lại. Đây là lựa chọn cho demo/học tập; RAM 512 MB có thể cần nâng gói nếu ứng dụng phát triển. Xem [giới hạn miễn phí](https://render.com/docs/free) và [bảng giá](https://render.com/pricing).

## 1. Đẩy mã nguồn lên GitHub

Tạo một repository **Private** trên GitHub. Nếu dùng GitHub Desktop, chọn **Add local repository** với thư mục `learning-app`, tạo repository tại đó nếu chưa có Git, rồi **Publish repository** và giữ **Keep this code private**.

Nếu dùng terminal, chạy từ thư mục `learning-app`:

```bash
git init
git add .
git status --short
```

Trước khi commit, danh sách không được có `wallet_quizdb`, `.private-exports`, `application-local.properties`, `application-oauth2.properties`, các file tải về `client_secret*.json`, `.env` hay `flyway/conf/flyway.toml`. Các mục đó đã được đưa vào `.gitignore`. Nếu file từng được commit ở repository khác, `.gitignore` không tự xóa lịch sử cũ; dùng repository mới với cấu hình đã tách secrets.

```bash
git commit -m "Prepare Quizz App deployment"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

Các file cần có trên GitHub: `Dockerfile`, `.dockerignore`, `render.yaml`, `deploy/entrypoint.sh`, thư mục `quiz-web`, `quiz-api` và các migration SQL. Không cần commit `node_modules`, `dist` hoặc `target`.

## 2. Tạo dịch vụ Render

Đăng nhập [Render](https://dashboard.render.com/), chọn **New → Web Service**, kết nối GitHub và chọn repository vừa tạo.

Điền:

| Mục | Giá trị |
| --- | --- |
| Name | `quizz-app` hoặc tên riêng của bạn |
| Region | Singapore |
| Language / Runtime | Docker |
| Root Directory | Để trống: Dockerfile dùng cả FE và BE ở thư mục gốc |
| Dockerfile Path | `./Dockerfile` |
| Instance Type | Free |
| Health Check Path | `/api/ping` |

Không cần điền lệnh Build/Start riêng: Dockerfile đã có. Cũng có thể chọn **New → Blueprint** với repository có `render.yaml`; các biến `sync: false` được hỏi trong lần tạo đầu. Xem [Docker trên Render](https://render.com/docs/docker) và [Blueprint](https://render.com/docs/blueprint-spec).

## 3. Điền biến môi trường của backend

Trong **Environment → Environment Variables**, thêm:

| Biến | Điền gì |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DB_URL` | `jdbc:oracle:thin:@quizdb_low?TNS_ADMIN=/tmp/quizz-app-wallet` |
| `DB_USERNAME` | Username Oracle trong file cục bộ `quiz-api/src/main/resources/application-local.properties` |
| `DB_PASSWORD` | Password Oracle trong cùng file |
| `GOOGLE_CLIENT_ID` | Client ID trong file cục bộ `application-oauth2.properties` |
| `GOOGLE_CLIENT_SECRET` | Client Secret trong cùng file |

Nếu wallet của bạn dùng tên kết nối khác `quizdb_low`, thay alias đó trong `DB_URL`. Không điền đường dẫn `/Users/macbook/...` lên Render.

URL public tự lấy từ `RENDER_EXTERNAL_URL`, là URL Render cấp cho dịch vụ. Khi dùng domain riêng, thêm `APP_PUBLIC_URL=https://your-domain.com`, không thêm dấu `/` cuối. Xem [biến mặc định của Render](https://render.com/docs/environment-variables).

Database hiện tại đã có một ADMIN, nên không cần `ADMIN_BOOTSTRAP_EMAIL`. Với database mới chưa có ADMIN, có thể thêm biến này bằng email Google được chọn làm admin đầu tiên.

## 4. Đưa wallet lên dưới dạng Secret File

Backend hiện kết nối Oracle bằng mTLS nên cần wallet ở môi trường deploy. Wallet **không được đưa lên GitHub hoặc đóng vào Docker image**, và FE không cần wallet.

File riêng đã được tạo tại `.private-exports/wallet.zip.b64`. Để tạo lại nếu wallet thay đổi:

```bash
python3 deploy/prepare-wallet.py
```

Mở file đó bằng trình soạn thảo và sao chép toàn bộ nội dung. Trong Render, vào **Environment → Secret Files → Add Secret File**:

- **Filename:** `wallet.zip.b64`
- **Contents:** nội dung file `.private-exports/wallet.zip.b64`

Chọn **Save, rebuild, and deploy** (hoặc Save rồi Manual Deploy). Script khởi động sẽ giải mã wallet vào `/tmp/quizz-app-wallet` và sửa đường dẫn cấu hình phù hợp với container. Nếu lần deploy đầu chạy trước khi bạn thêm secret, nó có thể chưa kết nối được Oracle; thêm secret rồi deploy lại.

Render cung cấp secret file ở `/etc/secrets/<filename>`. `.dockerignore` cũng loại bỏ file secret nếu Render đưa nó vào build context. Xem [Secret Files](https://render.com/docs/configure-environment-variables) và [Secrets với Docker](https://render.com/docs/docker-secrets).

Khi Oracle đã bật TLS không yêu cầu mTLS và đáp ứng điều kiện mạng, JDBC có thể dùng connection string TLS không cần wallet. Cách ở đây giữ nguyên mTLS đang hoạt động để không phải đổi cấu hình Oracle. Xem [kết nối Oracle TLS/mTLS](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/connect-introduction.html).

Nếu Oracle giới hạn địa chỉ IP được kết nối, thêm các dải **Outbound IP Addresses** của dịch vụ Render vào ACL của database. Dải IP xem ở phần Connect của dịch vụ; dùng dải đúng region Singapore. Xem [Outbound IP của Render](https://render.com/docs/outbound-ip-addresses).

## 5. Thêm URL deploy vào Google OAuth

Sau khi Render cấp URL, ví dụ `https://quizz-app-xxxx.onrender.com`, mở Google Cloud Console → Google Auth Platform → Clients (hoặc APIs & Services → Credentials), chọn OAuth client Web đang dùng.

Thêm **Authorized redirect URI**:

```text
https://quizz-app-xxxx.onrender.com/login/oauth2/code/google
```

Thay bằng đúng URL của bạn. Giữ redirect URI localhost để vẫn dev trên máy. Không dùng `/login/success` làm callback Google: đó là trang frontend sau khi backend đã xác thực xong. Nếu consent screen đang ở Testing, thêm email dùng thử vào Test users.

Google yêu cầu redirect URI khớp chính xác. Xem [Google OAuth cho Web Server](https://developers.google.com/identity/protocols/oauth2/web-server).

## 6. Kiểm tra

- Mở `https://YOUR_APP.onrender.com/api/ping`: có `{"status":"ok"}`.
- Mở `/api/auth/config`: có `"googleEnabled":true`.
- Mở `/login`, đăng nhập Google và kiểm tra ADMIN vào trang quản trị.
- Tải lại `/admin/attempts` và mở một link bộ đề để kiểm tra React Router.

Mỗi lần push thay đổi lên branch đã kết nối, Render có thể build và deploy lại. Nếu Google báo `redirect_uri_mismatch`, kiểm tra URL callback ở bước 5. Nếu có ORA/timeout, kiểm tra wallet, `DB_URL`, tài khoản Oracle và ACL; nếu dịch vụ bị thiếu bộ nhớ, xem Logs và cân nhắc nâng gói.

## Có cần đưa Flyway lên không?

**Migration SQL:** có thể commit để lưu lịch sử schema. **File cấu hình chứa password:** không commit. **Bộ cài Flyway:** không cần đưa lên server ứng dụng.

Ứng dụng hiện dùng `spring.jpa.hibernate.ddl-auto=validate`, không tự chạy Flyway. Khi dùng lại Oracle hiện tại đã có bảng và migration, không chạy lại V1. Khi có migration mới, chạy Flyway từ máy local vào chính database đó trước khi deploy phiên bản yêu cầu schema mới. Nếu đổi sang database trống, chạy migration đầy đủ một lần trước khi backend khởi động.

## Chạy local sau khi tách cấu hình

```bash
./quiz-api/scripts/run-local.sh
```

Thông tin Oracle đã được giữ trong file local bị Git bỏ qua `application-local.properties`. Google vẫn nằm ở `application-oauth2.properties`. Với checkout mới, sao chép hai file `.example` tương ứng rồi điền thông tin. FE dev vẫn chạy `npm run dev` trong `quiz-web` như trước.

## Luyện tập không giới hạn

Trang Khám phá hiển thị các bộ đề đã xuất bản; user đăng nhập có thể luyện tập nhiều lần và mỗi lần nộp vẫn được lưu riêng. Database cần chạy migration `flyway/migrations/V4__allow_unlimited_practice.sql` để bỏ index giới hạn một lượt đầu tiên. Migration giữ nguyên dữ liệu cũ và ràng buộc lượt làm lại theo quyền admin. Nếu dùng cùng database Oracle đã cập nhật ở máy phát triển, không cần chạy lại.
