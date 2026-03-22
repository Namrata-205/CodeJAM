"""
app/redis_queue.py
Creates the Redis connection and the RQ queue used for code execution jobs.
All connection parameters come from app/config.py (sourced from .env).
"""
import redis
from rq import Queue

from app.config import REDIS_DB, REDIS_HOST, REDIS_PORT

redis_conn = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    decode_responses=False,     # RQ requires bytes mode
)

code_queue = Queue("code_execution", connection=redis_conn)