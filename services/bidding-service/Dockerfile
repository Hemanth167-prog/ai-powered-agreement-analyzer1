FROM python:3.10-slim
WORKDIR /app
COPY services/bidding-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY services/bidding-service/src ./src
EXPOSE 4009
ENV PYTHONUNBUFFERED=1
CMD ["python", "src/main.py"]
