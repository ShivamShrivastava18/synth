FROM python:3.11-slim

# libgomp1 is required by XGBoost at runtime. build-essential lets pip
# fall back to source builds for any wheel that doesn't ship a manylinux
# variant for our base image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first so they can cache across code edits
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir .

# Copy source
COPY src ./src

# uvicorn listens on $PORT (Cloud Run sets this)
ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1
EXPOSE 8080
CMD exec uvicorn synth_engine.api:app --host 0.0.0.0 --port ${PORT:-8080}
