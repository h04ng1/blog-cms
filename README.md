# Blog CMS — Personal Project

Dự án blog/CMS full-stack để luyện kỹ năng backend: **FastAPI + SQLAlchemy + JWT auth + Alembic migrations**, đi kèm frontend tối giản bằng HTML/CSS/JS thuần (không framework) để demo trực quan.

## Kiến trúc

```
blog-cms/
  backend/
    app/
      core/      # config (env settings), security (hash password, JWT)
      db/        # SQLAlchemy engine/session, declarative Base
      models/    # ORM models: User, Category, Tag, Post, Comment
      schemas/   # Pydantic request/response schemas
      crud/      # Hàm thao tác DB, tách riêng khỏi route handlers
      api/
        deps.py    # Dependencies: get_db, get_current_user, get_current_admin
        routes/    # Route handlers theo resource (auth, posts, comments, ...)
      main.py    # Khởi tạo FastAPI app, gắn router, CORS, static files
    alembic/     # Database migrations
    seed.py      # Script tạo admin user + dữ liệu mẫu
  frontend/
    index.html, post.html, login.html, register.html, dashboard.html
    js/          # api.js (gọi API), auth.js (nav + session), main.js, post.js, dashboard.js
    css/style.css
```

**Vì sao chia lớp như vậy?** Đây là pattern phổ biến trong backend thực tế:
- `models` (dữ liệu) tách khỏi `schemas` (hợp đồng API) — DB thay đổi không bắt buộc API thay đổi.
- `crud` tách khỏi `routes` — logic truy vấn DB tái dùng được, route chỉ lo HTTP (status code, auth).
- `deps.py` tập trung các dependency dùng chung (ví dụ "ai đang gọi API này").

## Tính năng backend

- **Auth**: đăng ký, đăng nhập trả JWT (`OAuth2PasswordBearer`), mật khẩu hash bằng bcrypt.
- **Phân quyền**: role `user` / `admin`. Tác giả hoặc admin mới được sửa/xoá bài viết, comment của chính họ.
- **Posts**: CRUD, trạng thái `draft`/`published`, slug tự sinh và tự tránh trùng, đếm views, upload ảnh cover.
- **Category & Tag**: category 1-nhiều với post, tag nhiều-nhiều (many-to-many) với post.
- **Comments**: CRUD cơ bản gắn theo post.
- **Tìm kiếm & lọc & phân trang**: `/posts?search=...&category=...&tag=...&page=1&page_size=10`.
- **Alembic**: migration có version, không cần `create_all` thủ công.
- **Swagger UI** tự sinh tại `/docs` — dùng để test API độc lập với frontend.

## Chạy backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

alembic revision --autogenerate -m "init schema"
alembic upgrade head

python seed.py                  # tạo admin@example.com / admin123 + dữ liệu mẫu

uvicorn app.main:app --reload --port 8000
```

API chạy tại `http://127.0.0.1:8000`, docs tại `http://127.0.0.1:8000/docs`.

## Chạy frontend

Frontend là file tĩnh, chỉ cần một static server đơn giản (không cần build tool):

```bash
cd frontend
python3 -m http.server 5500
```

Mở `http://127.0.0.1:5500`. Đăng nhập bằng `admin@example.com` / `admin123` hoặc tạo tài khoản mới ở `/register.html`.

> Nếu đổi cổng frontend, nhớ thêm origin đó vào `CORS_ORIGINS` trong `backend/.env`.

## Luồng demo gợi ý

1. Mở trang chủ → xem bài viết mẫu (public, không cần login).
2. Đăng ký tài khoản mới → vào Dashboard → "New Post" → tạo bài viết (draft).
3. Sửa bài viết đó → upload ảnh cover → chuyển status sang "published".
4. Mở bài viết ở trang chủ, thêm bình luận.
5. Đăng nhập bằng admin → vào Dashboard → tab "Categories" để thêm/xoá category, thấy được toàn bộ bài viết (cả của người khác).

## Những điểm đáng học từ dự án này

- Cách tổ chức một REST API theo layer (routes → crud → models) để code không rối khi project lớn lên.
- JWT stateless auth: server không lưu session, mỗi request tự chứng minh danh tính qua token.
- Alembic migration: thay đổi schema có version, revert được, giống cách team thật quản lý DB.
- Many-to-many relationship (Post ↔ Tag) và cách FastAPI + Pydantic serialize quan hệ lồng nhau.
- Phân quyền ở tầng dependency (`get_current_admin`) thay vì rải `if` trong từng route.
- Pagination & filter query params — pattern bắt buộc phải biết khi làm API thực tế.

## Hướng mở rộng tiếp theo (tự luyện thêm)

- Viết test với `pytest` + `TestClient` cho các route chính.
- Đổi SQLite sang PostgreSQL (chỉ cần sửa `DATABASE_URL`).
- Thêm refresh token / rotate JWT.
- Thêm rate limiting cho endpoint comment để chống spam.
- Containerize bằng Docker + docker-compose (backend + Postgres).
