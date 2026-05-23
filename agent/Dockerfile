FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir .

COPY tools ./tools
COPY tool_server.py ./

ENV PYTHONUNBUFFERED=1
EXPOSE 8080
CMD exec uvicorn tool_server:app --host 0.0.0.0 --port ${PORT:-8080}
