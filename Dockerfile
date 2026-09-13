FROM python:3.11-slim

WORKDIR /code

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose Hugging Face Space default port
EXPOSE 7860

# Start FastAPI application
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "7860"]
