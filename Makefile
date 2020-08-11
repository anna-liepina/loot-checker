.DEFAULT_GOAL := interactive
.DEV_IMAGE := loot-cwa
.SERVE_IMAGE := loot-cwa-serve

.PORT := 8080
PORT := $(.PORT)

.SHARED_VOLUMES := \
	-v $(PWD)/public:/www/public \
	-v $(PWD)/src:/www/src \
	-v $(PWD)/.env:/www/.env

.ENV_VARIABLES := \
	-e PORT=$(PORT)

help:
	@echo ""
	@echo " LOOT CHECKER [ client web application ] "
	@echo "-----------------------------------------"
	@echo ""
	@echo " make help\t\tdisplay help"
	@echo ""
	@echo "-- DOCKER IMAGE PREPARATION"
	@echo " make dev-image\t\tbuild [$(.DEV_IMAGE)] image which encapsulate dev-dependencies, nothing else"
	@echo " make serve-image\tbuild [$(.SERVE_IMAGE)] image which encapsulate 'serve', nothing else"
	@echo ""
	@echo "-- DOCKER ORCHESTRATION"
	@echo " make cy-image\t\tbuild CWA, GraphQL, Cypress docker images for 'end to end' test execution"
	@echo ""
	@echo "-- COMMANDS"
	@echo " make\t\t\talias for 'make $(.DEFAULT_GOAL)'"
	@echo " make interactive\trun [$(.DEV_IMAGE)] image, content become available on http://localhost:$(PORT)"
	@echo " make serve\t\trun [$(.SERVE_IMAGE)] image, content become available on http://localhost:$(PORT)"
	@echo " make test\t\texecute unit and functional tests"
	@echo " make cypress\t\texecute 'cypress' integration tests"
	@echo " make build\t\tgenerate static assets in './build' directory"
	@echo ""
	@echo "-- ARGUMENTS"
	@echo " argument\t\tdefault"
	@echo " PORT\t\t\t$(.PORT)"

cy-image:
	docker-compose -f cypress.compose.yml build

dev-image:
	docker build -t $(.DEV_IMAGE) .

serve-image:
	docker build -t $(.SERVE_IMAGE) . -f serve.Dockerfile

build: dev-image
	mkdir -p $(PWD)/build
	docker run \
		--rm \
		-it \
		-v $(PWD)/build:/www/build \
		$(.SHARED_VOLUMES) \
		$(.ENV_VARIABLES) \
		--entrypoint=npm \
		$(.DEV_IMAGE) run build

test: dev-image
	docker run \
		--rm \
		--name ${.DEV_IMAGE}-test \
		-it \
		$(.SHARED_VOLUMES) \
		$(.ENV_VARIABLES) \
		--entrypoint=npm \
		$(.DEV_IMAGE) run test

cypress: cy-image
	docker-compose -f cypress.compose.yml up --abort-on-container-exit

interactive: dev-image
	docker run \
		--rm \
		--name ${.DEV_IMAGE}-$(PORT) \
		-it \
		$(.SHARED_VOLUMES) \
		$(.ENV_VARIABLES) \
		-p $(PORT):$(PORT) \
		--entrypoint=npm \
		$(.DEV_IMAGE) run start

serve: build serve-image
	docker run \
		--rm \
		--name ${.DEV_IMAGE}-serve-$(PORT) \
		-it \
		-v $(PWD)/build:/www/build \
		-v $(PWD)/serve.json:/www/serve.json \
		-e NO_UPDATE_CHECK=1 \
		$(.ENV_VARIABLES) \
		-p $(PORT):$(PORT) \
		--entrypoint=serve \
		$(.SERVE_IMAGE) -n
