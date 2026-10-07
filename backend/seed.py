"""Seed the database with a demo admin user, categories, and sample posts."""
from app.crud.category import create as create_category
from app.crud.category import get_by_slug
from app.crud.post import create as create_post
from app.crud.user import create as create_user
from app.crud.user import get_by_email
from app.db.session import SessionLocal
from app.models.post import PostStatus
from app.models.user import UserRole
from app.schemas.category import CategoryCreate
from app.schemas.post import PostCreate
from app.schemas.user import UserCreate


def run():
    db = SessionLocal()
    try:
        admin = get_by_email(db, "admin@example.com")
        if not admin:
            admin = create_user(
                db,
                UserCreate(
                    email="admin@example.com",
                    username="admin",
                    full_name="Admin User",
                    password="admin123",
                ),
            )
            admin.role = UserRole.ADMIN
            db.commit()
            print("Created admin user: admin@example.com / admin123")
        else:
            print("Admin user already exists")

        categories = {}
        for name in ["Backend", "Frontend", "DevOps"]:
            existing = get_by_slug(db, name.lower())
            categories[name] = existing or create_category(db, CategoryCreate(name=name))

        sample_posts = [
            (
                "Getting Started with FastAPI",
                "Backend",
                ["fastapi", "python"],
                "FastAPI is a modern, fast web framework for building APIs with Python 3.7+ "
                "based on standard type hints.\n\nIn this post we cover routing, dependency "
                "injection, and automatic docs generation.",
            ),
            (
                "Understanding REST API Design",
                "Backend",
                ["api", "architecture"],
                "A good REST API is predictable, consistent, and easy to use.\n\nWe discuss "
                "resource naming, status codes, pagination, and versioning strategies.",
            ),
            (
                "JWT Authentication Explained",
                "Backend",
                ["auth", "security"],
                "JSON Web Tokens let you build stateless authentication for your APIs.\n\n"
                "This post walks through how tokens are signed, verified, and used safely.",
            ),
        ]

        for title, category_name, tags, content in sample_posts:
            existing_slug = title.lower().replace(" ", "-")
            from app.crud.post import get_by_slug as get_post_by_slug

            if get_post_by_slug(db, existing_slug):
                continue
            create_post(
                db,
                PostCreate(
                    title=title,
                    summary=content.split("\n\n")[0],
                    content=content,
                    status=PostStatus.PUBLISHED,
                    category_id=categories[category_name].id,
                    tag_names=tags,
                ),
                author_id=admin.id,
            )
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
