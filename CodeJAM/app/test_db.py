from app.db import engine

async def test():
    async with engine.begin() as conn:
        print("DB connected!")

