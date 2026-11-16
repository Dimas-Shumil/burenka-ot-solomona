# Установка, Git и размещение

## Локально: CMD

Полный порядок в README.md. Используйте новую папку, оставив старую как резервную.
В комплекте нет node_modules и рабочей .env. `.env.example` предназначен для
localhost, `deploy/.env.production.example` — для сервера. Не размещайте их через
публичный файловый сервер. `env:init` генерирует секрет без вывода значения.

Удобная последовательность:

```bat
cd /d C:\Users\ШУМ\WORKS\burenka-ot-solomona
npm ci
if not exist .env copy .env.example .env
npm run env:init
npm run db:init
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
npm run seed
npm run user:create
npm run build
npm test
npm run dev
```

`npm ci` использует lockfile. `db:init` создаёт файл SQLite, если его нет, без
сброса данных. `migrate deploy` применяет готовые SQL-миграции; `db push` и
`migrate reset` при установке не нужны. При повторной установке не создавайте
OWNER заново. Проблемы пароля решаются `npm run owner:reset` в консоли сервера.

## Git перед переносом изменений

Сначала в исходной рабочей папке с вашим .git:

```bat
git status --short
git remote -v
git fetch --all --prune
git rev-list --left-right --count origin/main...upstream/main
git log -5 --oneline "david/Давид"
git rev-list --left-right --count HEAD..."david/Давид"
```

Если есть новые коммиты после f4eca23, сначала сравните их с комплектом. Не
перезаписывайте их распаковкой и не используйте `reset --hard`/force push.
Сохраните незакоммиченные изменения отдельной копией. Перенесите содержимое
комплекта в рабочую папку с сохранением её .git либо скопируйте свою .git в новую
проверенную копию. Строго не переносите секреты и базы в публичную историю.

В старой копии после осознанного переноса не должны оставаться `site/scripts`,
`public/cart.html`, `public/partner.html` и устаревшие CSS cart/catalog/product/sales.
Основные изображения теперь WebP; старые PNG в новой полной копии отсутствуют.
Новая папка из ZIP уже содержит правильное дерево, поэтому отдельная очистка
для неё не нужна.

После проверки diff и успешных тестов можно подготовить локальный коммит:

```bat
git diff --stat
git diff --check
git status --short
git add .
git commit -m "Реализована B2B-платформа Бурёнка с каталогом и панелью собственника"
```

Push выполняется только после подтверждения пользователя:

```bat
git push origin main
```

Обновление PabloAlligator остаётся за пользователем. Содержимое .git в архив не
включено, поэтому сам архив не меняет ветки и remotes.

## Сервер: Ubuntu, Node 24, PM2, nginx

Следующие команды — только инструкция, в этой работе на сервере они не запускались.
Предполагается `/var/www/burenka`, Node 24.x, заранее установленный nginx и PM2.
Не запускайте приложение от root. Владельцу процесса нужны права на `prisma`,
`uploads`, `backups` и `.env`; другим пользователям не нужен доступ к базе/секретам.

```bash
cd /var/www/burenka
npm ci
cp deploy/.env.production.example .env
npm run env:init
```

В `.env` замените `example.com` на настоящий домен; порт nginx/PM2 должен
соответствовать `PORT=3108`. Установите DATABASE_URL и сохраните секрет между
перезапусками. `APP_ORIGIN` — только реальный HTTPS origin, без пути и завершающего
слеша. При другом порте/домене отредактируйте и nginx. TRUST_PROXY=loopback только
за локальным reverse proxy. Не открывайте порт приложения в интернет.

```bash
npm run db:init
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
npm run seed
npm run user:create
npm run build
npm test
chmod 600 .env
pm2 start deploy/ecosystem.config.cjs
pm2 save
curl -f http://127.0.0.1:3108/health/ready
```

`seed` нужен при первом демонстрационном запуске, после наполнения его не надо
повторять при каждом обновлении. Тесты используют отдельную БД.

Скопируйте и адаптируйте `deploy/nginx.conf.example` в отдельный vhost. Укажите
реальный домен, активируйте конфигурацию, проверьте `nginx -t` и reload. После
проверки A/AAAA DNS выпустите сертификат через certbot nginx для вашего домена.
Не запускайте certbot с доменом example.com. Проверьте автоматическое продление.
Настройте один канонический хост и HTTP→HTTPS; не оставляйте второе индексируемое
зеркало www без редиректа.

После заполнения контента и проверки сайта установите `SEO_INDEXABLE=true`,
перезапустите только `burenka` с `--update-env`, проверьте robots/sitemap и отправьте
sitemap в Яндекс Вебмастер/Google Search Console. До этого оставляйте false.

## Обновление

Перед изменением кода и схемы:

```bash
cd /var/www/burenka
npm run backup
```

После получения подтверждённых изменений обычным fast-forward, без force/reset:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm test
pm2 restart burenka --update-env
pm2 save
curl -f http://127.0.0.1:3108/health/ready
```

## Резервные копии

`npm run backup` использует SQLite `VACUUM INTO` для согласованного снимка базы и
копирует uploads в `backups/<UTC-метка>/`. Это не просто копирование открытого .db.
В копии есть `database.db`, `uploads/`, `backup.json`. `.env` не включается:
сохраните его отдельно в защищённом месте.

Настройте ежедневный запуск из корня проекта и защищённую внешнюю копию. Пример
команды cron: `cd /var/www/burenka && /usr/bin/node scripts/backup.js`. При другом
расположении Node укажите реальный путь. Время cron зависит от timezone сервера.
Храните несколько поколений; раз в месяц проверяйте восстановление на отдельной
копии. Персональные данные заявок остаются в бэкапах, доступ должен быть ограничен.
Для консистентной копии файлов не запускайте media:cleanup одновременно с backup.

## Восстановление

Остановите именно приложение `burenka`, сохраните текущую базу и uploads отдельной
копией. Убедитесь, что DATABASE_URL указывает на восстанавливаемую БД. Скрипт
проверяет integrity_check, переносит базу и медиа и отзывает восстановленные
сессии, чтобы старые токены не ожили.

```bash
pm2 stop burenka
node scripts/restore-backup.js /var/www/burenka/backups/ИМЯ_КОПИИ --confirm-offline
npx prisma migrate deploy
pm2 restart burenka --update-env
curl -f http://127.0.0.1:3108/health/ready
```

Флаг --confirm-offline означает, что процессы с этой базой действительно
остановлены. Нельзя восстанавливать поверх базы работающего приложения.

## Проверка на устройствах

На localhost у ПК работают service worker и PWA. На телефоне `localhost` означает
сам телефон. Для проверки с телефона используйте реальный тестовый домен с HTTPS;
обычный HTTP на LAN-IP не даёт полноценную геолокацию и установку PWA.
Проверьте:
- Шапку/меню, каталог, фильтры, товар/вкладки/галерею на 390px и desktop.
- Вход, все редакторы, загрузку/перестановку фото, статусы заявок, выход.
- Разрешённую/запрещённую/недоступную геолокацию, точки без координат, маршрут.
- PWA только после входа, «Позже», установленное приложение, обновление,
  отсутствие приватных ответов в Cache Storage и offline-заглушку.
- Safari iOS: «Поделиться» → «На экран Домой»; Android/Chrome — штатная установка.
