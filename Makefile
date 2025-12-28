# AFLWP Email Worker Makefile

# --- Configuration ---
COMPONENT = email-worker
COMPONENT_CONTAINERS = redis,email-worker
DOCKER = docker
DOCKER_COMPOSE = docker compose

# Debug mode: set DEBUG=1 to print commands instead of executing them
DEBUG ?= 0

PROJECT_PREFIX 			= aflwp-control
PROJECT_NAME_DEV    = $(PROJECT_PREFIX)-dev
PROJECT_NAME_PROD   = $(PROJECT_PREFIX)-prod

STATE_FILE = .selected.environment

# Define base compose files
COMPOSE_FILES_BASE = -f scripts/docker/docker-compose.yml
COMPOSE_FILES_DEV = $(COMPOSE_FILES_BASE) -f scripts/docker/docker-compose.override.yml
COMPOSE_FILES_PROD = $(COMPOSE_FILES_BASE)

ENV_FILE_DEV = .env.development
ENV_FILE_PROD = .env.production

# Default target
.DEFAULT_GOAL := help

# --- Internal Utility Functions ---

# Function to validate that only allowed arguments are passed to a make target
# Parameters: target_name (e.g., "dev", "logs", etc.), allowed_args (space-separated list, e.g., "NAME")
# Usage: $(call validate_allowed_args,dev,"")
#        $(call validate_allowed_args,db-migrate,"NAME")
# Only allows DEBUG=1 and specified arguments
# Validates MAKECMDGOALS to detect unknown targets and positional arguments
define validate_allowed_args
	$(if $(strip $(2)),$(eval ALLOWED_VARS := $(2) DEBUG),$(eval ALLOWED_VARS := DEBUG))
	$(eval KNOWN_TARGETS := dev prod down clean logs restart status help)
	$(eval UNKNOWN_TARGETS := $(filter-out $(1) $(KNOWN_TARGETS),$(MAKECMDGOALS)))
	$(eval POSITIONAL_ARGS := $(filter-out $(1) validate-component,$(filter-out %=%,$(MAKECMDGOALS))))
	$(if $(UNKNOWN_TARGETS)$(POSITIONAL_ARGS),$(if $(strip $(2)),$(error ❌ Error: 'make $(1)' does not accept the following arguments: $(strip $(UNKNOWN_TARGETS) $(POSITIONAL_ARGS)). Allowed arguments: $(2) DEBUG. Usage: make $(1) $(2)=value [DEBUG=1]),$(error ❌ Error: 'make $(1)' does not accept the following arguments: $(strip $(UNKNOWN_TARGETS) $(POSITIONAL_ARGS)). Allowed arguments: DEBUG. Usage: make $(1) [DEBUG=1])))
endef

# Function to validate that no arguments are passed to a make target (except DEBUG=1)
# Parameters: target_name (e.g., "dev", "logs", etc.)
# Usage: $(call validate_no_args,dev)
define validate_no_args
	$(eval KNOWN_TARGETS := dev prod down clean logs restart status help)
	$(eval UNKNOWN_TARGETS := $(filter-out $(1) $(KNOWN_TARGETS),$(MAKECMDGOALS)))
	$(eval POSITIONAL_ARGS := $(filter-out $(1) validate-component,$(filter-out %=%,$(MAKECMDGOALS))))
	$(eval INVALID_VARS := $(filter-out DEBUG=%,$(filter %=%,$(MAKECMDGOALS))))
	$(if $(UNKNOWN_TARGETS)$(POSITIONAL_ARGS)$(INVALID_VARS),$(error ❌ Error: 'make $(1)' does not accept the following arguments: $(strip $(UNKNOWN_TARGETS) $(POSITIONAL_ARGS) $(INVALID_VARS)). Allowed arguments: DEBUG. Usage: make $(1) [DEBUG=1]))
endef

# Function (internal target) to read PROJECT_NAME from state file
# Uses 'export' so the variable is available in subsequent shell commands
define get_project_name
	@if [ ! -f $(STATE_FILE) ]; then \
		echo "❌ Error: No active environment selected."; \
		echo "   Usage: Run 'make dev' or 'make prod' first."; \
		exit 1; \
	fi
	export PROJECT_NAME=$$(cat $(STATE_FILE));
endef

# Function to determine compose files, env file, and app env file based on project name
# Sets COMPOSE_FILES, ENV_FILE, APP_ENV_FILE, and BUILD_TARGET variables based on whether project is dev or prod
define get_compose_config
	$(call get_project_name) \
	case "$$PROJECT_NAME" in \
		*-dev) \
			export COMPOSE_FILES="$(COMPOSE_FILES_DEV)"; \
			export ENV_FILE="$(ENV_FILE_DEV)"; \
			export APP_ENV_FILE="../../$(ENV_FILE_DEV)"; \
			export BUILD_TARGET="development"; \
			;; \
		*-prod) \
			export COMPOSE_FILES="$(COMPOSE_FILES_PROD)"; \
			export ENV_FILE="$(ENV_FILE_PROD)"; \
			export APP_ENV_FILE="../../$(ENV_FILE_PROD)"; \
			export BUILD_TARGET="production"; \
			;; \
		*) \
			echo "❌ Error: Unknown project type. Project name must end with -dev or -prod."; \
			exit 1; \
			;; \
	esac
endef

# Function to execute command or print it in debug mode
# Parameters: command to execute
define exec_command
	if [ "$(DEBUG)" = "1" ]; then \
		echo "🔍 [DEBUG] Would execute: $(1)"; \
	else \
		$(1); \
	fi
endef

# Function to request user confirmation for dangerous operations
# Parameters: warning_message, cancel_message (optional, default: "Operation cancelled.")
# Usage: $(call confirm_dangerous_operation,"WARNING: This will delete all data","Cleanup cancelled.")
# In DEBUG mode, skips confirmation
define confirm_dangerous_operation
	echo "$(1)"; \
	echo ""; \
	if [ "$(DEBUG)" != "1" ]; then \
		read -p "Are you sure you want to continue? (Y/N): " confirm; \
		if [ "$$confirm" != "Y" ] && [ "$$confirm" != "y" ]; then \
			echo "❌ $(if $(2),$(2),Operation cancelled.)"; \
			exit 1; \
		fi; \
	fi
endef

# Function to validate environment state before starting
# Checks if another environment is already running and prevents conflicts
# Parameters: target_env (dev or prod), target_project_name
define validate_environment_state
	@if [ -f $(STATE_FILE) ] && [ -s $(STATE_FILE) ]; then \
		CURRENT_STATE=$$(cat $(STATE_FILE)); \
		if [ "$$CURRENT_STATE" = "$(PROJECT_NAME_PROD)" ] && [ "$(2)" = "$(PROJECT_NAME_DEV)" ]; then \
			echo "❌ Error: $(COMPONENT) is already running in Development environment ($$CURRENT_STATE)"; \
			echo "   Please run 'make down' or 'make clean' first to stop the production environment."; \
			exit 1; \
		elif [ "$$CURRENT_STATE" = "$(PROJECT_NAME_DEV)" ] && [ "$(2)" = "$(PROJECT_NAME_PROD)" ]; then \
			echo "❌ Error: $(COMPONENT) is already running in Production environment ($$CURRENT_STATE)"; \
			echo "   Please run 'make down' or 'make clean' first to stop the development environment."; \
			exit 1; \
		fi; \
	fi; \
	if [ "$(2)" = "$(PROJECT_NAME_DEV)" ]; then \
		OTHER_PROJECT="$(PROJECT_NAME_PROD)"; \
		OTHER_ENV="production"; \
	elif [ "$(2)" = "$(PROJECT_NAME_PROD)" ]; then \
		OTHER_PROJECT="$(PROJECT_NAME_DEV)"; \
		OTHER_ENV="development"; \
	fi; \
	CONTAINER_PATTERN=$$(echo "$(COMPONENT_CONTAINERS)" | tr ',' '|'); \
	RUNNING_CONTAINERS=$$($(DOCKER) ps --filter label=com.docker.compose.project=$$OTHER_PROJECT --format "{{.Names}}" 2>/dev/null | grep -E "^($$CONTAINER_PATTERN)$$" | wc -l | tr -d ' '); \
	if [ "$$RUNNING_CONTAINERS" != "0" ]; then \
		echo "❌ Error: $(COMPONENT) is already running in $$OTHER_ENV environment ($$OTHER_PROJECT)."; \
		echo "   Please run 'make down' or 'make clean' first to stop the $$OTHER_ENV environment."; \
		exit 1; \
	fi
endef

# Function to generate status table for all components
# Collects containers from both dev and prod projects and formats them in a table
define generate_status_table
	OUTPUT="NAMES\tSTATUS\tPORTS\tENVIRONMENT"; \
	for project in $(PROJECT_NAME_DEV) $(PROJECT_NAME_PROD); do \
		CONTAINERS=$$($(DOCKER) ps --filter "label=com.docker.compose.project=$$project" --format "{{.Names}}" 2>/dev/null | wc -l | tr -d ' '); \
		if [ "$$CONTAINERS" != "0" ]; then \
			if [ "$$project" = "$(PROJECT_NAME_DEV)" ]; then \
				ENV="DEVELOPMENT"; \
			else \
				ENV="PRODUCTION"; \
			fi; \
			OUTPUT="$$OUTPUT"$$'\n'"$$($(DOCKER) ps --filter "label=com.docker.compose.project=$$project" --format "{{.Names}}\t{{.Status}}\t{{.Ports}}\t$$ENV" 2>/dev/null)"; \
		fi; \
	done; \
	printf "$$OUTPUT\n" | column -t -s $$'\t'
endef

# --- Main Commands ---

# Development environment (uses development stage)
.PHONY: dev
dev:
	$(call validate_no_args,dev)
ifneq ($(DEBUG),1)
	$(call validate_environment_state,dev,$(PROJECT_NAME_DEV))
endif
	@echo "🚀 Starting development environment..."
	@echo "   Build target: development"
	@if [ "$(DEBUG)" != "1" ]; then \
		echo $(PROJECT_NAME_DEV) > $(STATE_FILE); \
	fi
	@echo "   Environment file: .env.development"
	@export COMPOSE_FILES="$(COMPOSE_FILES_DEV)"; \
	export ENV_FILE="$(ENV_FILE_DEV)"; \
	export APP_ENV_FILE="../../$(ENV_FILE_DEV)"; \
	export BUILD_TARGET="development"; \
	$(call exec_command,APP_ENV_FILE=$$APP_ENV_FILE BUILD_TARGET=$$BUILD_TARGET $(DOCKER_COMPOSE) $$COMPOSE_FILES -p $(PROJECT_NAME_DEV) --env-file=$$ENV_FILE up -d --build)
	@:

# Production environment (uses production stage)
.PHONY: prod
prod:
	$(call validate_no_args,prod)
ifneq ($(DEBUG),1)
	$(call validate_environment_state,prod,$(PROJECT_NAME_PROD))
endif
	@echo "🚀 Starting production environment..."
	@echo "   Build target: production"
	@if [ "$(DEBUG)" != "1" ]; then \
		echo $(PROJECT_NAME_PROD) > $(STATE_FILE); \
	fi
	@echo "   Environment file: .env.production"
	@export COMPOSE_FILES="$(COMPOSE_FILES_PROD)"; \
	export ENV_FILE="$(ENV_FILE_PROD)"; \
	export APP_ENV_FILE="../../$(ENV_FILE_PROD)"; \
	export BUILD_TARGET="production"; \
	$(call exec_command,APP_ENV_FILE=$$APP_ENV_FILE BUILD_TARGET=$$BUILD_TARGET $(DOCKER_COMPOSE) $$COMPOSE_FILES -p $(PROJECT_NAME_PROD) --env-file=$$ENV_FILE up -d --build)
	@:


# Stop services
.PHONY: down
down:
	$(call validate_no_args,down)
	@$(call get_compose_config); \
	echo "🛑 Stopping services..."; \
	echo "   Build target: $$BUILD_TARGET"; \
	$(call exec_command,APP_ENV_FILE=$$APP_ENV_FILE BUILD_TARGET=$$BUILD_TARGET $(DOCKER_COMPOSE) $$COMPOSE_FILES -p $$PROJECT_NAME --env-file=$$ENV_FILE down --remove-orphans); \
	if [ "$(DEBUG)" != "1" ]; then \
		rm -f $(STATE_FILE); \
	fi
	@:


# Clean: Stop services and remove volumes (DANGEROUS)
.PHONY: clean
clean:
	$(call validate_no_args,clean)
	@$(call get_compose_config); \
	echo "   Build target: $$BUILD_TARGET"; \
	echo "   Project: $$PROJECT_NAME"; \
	echo ""; \
	$(call confirm_dangerous_operation,"🚨 WARNING: This command will PERMANENTLY delete all volumes and data.","Cleanup cancelled."); \
	echo "🧹 Proceeding with complete cleanup..."; \
	$(call exec_command,APP_ENV_FILE=$$APP_ENV_FILE BUILD_TARGET=$$BUILD_TARGET $(DOCKER_COMPOSE) $$COMPOSE_FILES -p $$PROJECT_NAME --env-file=$$ENV_FILE down -v); \
	if [ "$(DEBUG)" != "1" ]; then \
		rm -f $(STATE_FILE); \
	fi
	@:


# View component service logs only
.PHONY: logs
logs:
	$(call validate_no_args,logs)
	@$(call get_compose_config); \
	echo "🔍 Viewing logs for $(COMPONENT) in $$PROJECT_NAME..."; \
	$(call exec_command,APP_ENV_FILE=$$APP_ENV_FILE BUILD_TARGET=$$BUILD_TARGET $(DOCKER_COMPOSE) $$COMPOSE_FILES -p $$PROJECT_NAME --env-file=$$ENV_FILE logs -f $(COMPONENT))
	@:

# Restart component service
.PHONY: restart
restart:
	$(call validate_no_args,restart)
	@$(call get_compose_config); \
	echo "🔄 Restarting $(COMPONENT) services in $$PROJECT_NAME..."; \
	echo "   Build target: $$BUILD_TARGET"; \
	$(call exec_command,APP_ENV_FILE=$$APP_ENV_FILE BUILD_TARGET=$$BUILD_TARGET $(DOCKER_COMPOSE) $$COMPOSE_FILES -p $$PROJECT_NAME --env-file=$$ENV_FILE restart)
	@:

# Show status (all components only)
.PHONY: status
status:
	$(call validate_no_args,status)
	@echo "📊 Service status for all components:"; \
	echo ""; \
	$(call generate_status_table)
	@:

# Help
.PHONY: help
help:
	@echo "AFLWP $(COMPONENT) - Makefile Commands"
	@echo ""
	@echo "Environment Management:"
	@echo "  make dev              - Start $(COMPONENT) services in development environment"
	@echo "  make prod             - Start $(COMPONENT) services in production environment"
	@echo "  make restart          - Restart $(COMPONENT) services"
	@echo "  make down             - Stop $(COMPONENT) services"
	@echo "  make clean            - Stop $(COMPONENT) services and remove volumes (⚠️ DANGEROUS)"
	@echo ""
	@echo "Logs and Monitoring:"
	@echo "  make logs             - View main $(COMPONENT) service logs"
	@echo "  make status           - Show service status"
	@echo ""
	@echo "Debug Mode:"
	@echo "  make DEBUG=1 <command> - Print commands instead of executing them"
	@echo ""
	@echo "  make help             - Show this help message"

# Catch-all target to prevent invalid arguments
# This will match any target that doesn't match the above targets
%:
	@echo "❌ Error: Unknown target or invalid argument: $@"
	@echo ""
	@echo "   Run 'make help' to see available commands."
	@echo ""
	@echo "   Note: Only the following arguments are allowed:"
	@echo "     - DEBUG=1             (for any command)"
	@exit 1





