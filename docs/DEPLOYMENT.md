# Руководство по развертыванию

Это базовое руководство для развертывания проекта на production-сервере (VPS).

## Требования
- Сервер (VPS) с Ubuntu 22.04 или новее
- Установленные Docker и Docker Compose
- Доменное имя (рекомендуется для HTTPS)

## Шаг 1: Подготовка сервера

1.  **Клонируйте репозиторий:**
    ```bash
    git clone https://github.com/your-repo/code-spirit.git
    cd code-spirit
    ```

2.  **Настройте переменные окружения:**
    ```bash
    cp .env.example .env
    nano .env
    ```
    - Установите надежные пароли для `POSTGRES_PASSWORD` и `ADMIN_DEFAULT_PASSWORD`.
    - Сгенерируйте `SECRET_KEY` командой: `openssl rand -hex 32`.
    - Укажите ваш домен в `CORS_ORIGINS`, например: `https://your-domain.com`.

## Шаг 2: Запуск через Docker Compose

Запустите все сервисы в фоновом режиме:
```bash
docker compose up -d --build
```
*Флаг `-d` (detach) запускает контейнеры в фоне.*

## Шаг 3: Настройка Nginx (Reverse Proxy)

Рекомендуется использовать Nginx для обработки HTTPS и правильного распределения запросов.

1.  **Установите Nginx:**
    ```bash
    sudo apt update
    sudo apt install nginx
    ```

2.  **Создайте конфиг для вашего сайта:**
    ```bash
    sudo nano /etc/nginx/sites-available/codespirit
    ```

3.  **Вставьте и отредактируйте конфиг:**
    ```nginx
    server {
        listen 80;
        server_name your-domain.com; # <-- Замените на ваш домен

        # Перенаправляем основной трафик на фронтенд
        location / {
            proxy_pass http://localhost:5173;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Перенаправляем запросы к API на бэкенд
        location /api {
            proxy_pass http://localhost:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Настраиваем прокси для WebSocket
        location /ws {
            proxy_pass http://localhost:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }
    }
    ```

4.  **Активируйте конфиг и перезапустите Nginx:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/codespirit /etc/nginx/sites-enabled/
    sudo nginx -t # Проверка синтаксиса
    sudo systemctl restart nginx
    ```

После этого ваш проект будет доступен по вашему домену!
