import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.api import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api:app", host="0.0.0.0", port=8000, reload=True)
