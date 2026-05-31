import asyncio
import os
import sys

os.environ['DATABASE_URL'] = 'postgresql+asyncpg://farumasi:farumasi_pass@localhost:5432/farumasi_db'

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.connect() as conn:
        r = await conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_name='orders' ORDER BY ordinal_position"
        ))
        print("=== orders ===")
        for row in r.fetchall():
            print(row)
        
        r = await conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_name='revenue_records' ORDER BY ordinal_position"
        ))
        print("\n=== revenue_records ===")
        for row in r.fetchall():
            print(row)
        
        r = await conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_name='product_requests' ORDER BY ordinal_position"
        ))
        print("\n=== product_requests ===")
        for row in r.fetchall():
            print(row)
        
        r = await conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_name='notifications' ORDER BY ordinal_position"
        ))
        print("\n=== notifications ===")
        for row in r.fetchall():
            print(row)

asyncio.run(main())
