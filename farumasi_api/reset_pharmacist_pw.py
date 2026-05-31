"""Reset pharmacist password to known value."""
import asyncio, sys
sys.path.insert(0, '.')

PHARMACIST_EMAILS = [
    "pharmacist@farumasi.com",
    "pharmacist2@farumasi.com",
]
NEW_PASSWORD = "Pharmacy@12345"

async def main():
    from app.core.database import AsyncSessionLocal
    from app.core.security import hash_password
    from sqlalchemy import text
    
    new_hash = hash_password(NEW_PASSWORD)
    
    async with AsyncSessionLocal() as db:
        for email in PHARMACIST_EMAILS:
            await db.execute(
                text("UPDATE users SET password_hash = :h WHERE email = :e"),
                {"h": new_hash, "e": email}
            )
            print(f"Reset password for {email}")
        await db.commit()
        print("Done")

asyncio.run(main())
