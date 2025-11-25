FROM python:3.11-alpine
RUN adduser -D -u 1000 student
WORKDIR /code
RUN pip install --no-cache-dir pytest && \
    rm -rf /root/.cache
USER student
CMD ["python"]