.PHONY: help install dev web api api-build db-up db-ui db-down db-status db-migrate db-seed db-reset verify status stack-build stack-up stack-down stack-logs stack-status stack-tunnel stack-tunnel-logs

help:
	@echo "Smart Emergency commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install      Install pnpm dependencies"
	@echo "  make db-up        Start PostgreSQL/PostGIS"
	@echo "  make db-ui        Start DB + DbGate UI"
	@echo "  make db-migrate   Apply local dev migrations"
	@echo "  make db-seed      Seed mock-derived dev data"
	@echo ""
	@echo "Run:"
	@echo "  make web          Start Next.js frontend"
	@echo "  make api          Start emergency-api"
	@echo "  make dev          Start DB UI hint, then run web and api in separate terminals"
	@echo "  make stack-up     Start local full stack in Docker"
	@echo "  make stack-build  Build local full stack Docker images"
	@echo "  make stack-tunnel Start Cloudflare Tunnel for local API"
	@echo ""
	@echo "Check:"
	@echo "  make api-build    Build emergency-api"
	@echo "  make verify       Run backend build"
	@echo "  make status       Show git and Docker Compose status"
	@echo "  make stack-status Show local full stack Docker status"
	@echo ""
	@echo "Stop:"
	@echo "  make db-down      Stop Docker Compose services"
	@echo "  make stack-down   Stop local full stack Docker services"
	@echo "  make stack-logs   Follow local full stack Docker logs"
	@echo "  make stack-tunnel-logs Show Cloudflare Tunnel URL/logs"

install:
	pnpm install

db-up:
	docker compose up -d db

db-ui:
	docker compose up -d db dbgate

db-down:
	docker compose down

db-status:
	docker compose ps

db-migrate:
	pnpm db:migrate:contacts
	pnpm db:migrate:mock
	pnpm db:migrate:areas
	pnpm db:migrate:call-logs
	pnpm db:migrate:reporters
	pnpm db:migrate:category-master
	pnpm db:migrate:location-codes
	pnpm db:migrate:audit-logs
	pnpm db:migrate:contact-coverage
	pnpm db:migrate:db-readiness
	pnpm db:migrate:incident-tracking
	pnpm db:migrate:share-channels
	pnpm db:migrate:system-settings

db-seed:
	pnpm db:seed

db-reset:
	docker compose down -v
	docker compose up -d db dbgate
	pnpm db:migrate:contacts
	pnpm db:migrate:mock
	pnpm db:migrate:areas
	pnpm db:migrate:call-logs
	pnpm db:migrate:reporters
	pnpm db:migrate:category-master
	pnpm db:migrate:location-codes
	pnpm db:migrate:audit-logs
	pnpm db:migrate:contact-coverage
	pnpm db:migrate:db-readiness
	pnpm db:migrate:incident-tracking
	pnpm db:migrate:share-channels
	pnpm db:migrate:system-settings
	pnpm db:seed

web:
	pnpm dev

api:
	pnpm dev:api

api-build:
	pnpm build:api

verify:
	pnpm build:api

status:
	git status --short --branch
	docker compose ps

dev:
	@echo "Start these in separate terminals:"
	@echo "  make db-ui"
	@echo "  make api"
	@echo "  make web"

stack-build:
	docker compose -f docker-compose.yml -f docker-compose.local.yml build api
	docker compose -f docker-compose.yml -f docker-compose.local.yml build web

stack-up:
	docker compose -f docker-compose.yml -f docker-compose.local.yml up -d

stack-down:
	docker compose -f docker-compose.yml -f docker-compose.local.yml down

stack-logs:
	docker compose -f docker-compose.yml -f docker-compose.local.yml logs -f

stack-status:
	docker compose -f docker-compose.yml -f docker-compose.local.yml ps

stack-tunnel:
	docker compose -f docker-compose.yml -f docker-compose.local.yml up -d cloudflared

stack-tunnel-logs:
	docker compose -f docker-compose.yml -f docker-compose.local.yml logs -f cloudflared
