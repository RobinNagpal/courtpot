# CourtPot — web deploy targets.
#
# Nothing here starts an EAS Build. `expo export` bundles locally and
# `eas deploy` uploads static files, so these targets consume no build credits
# (they count against EAS Hosting requests instead). Only `eas build` costs
# build credits, and it is deliberately absent from this file.
#
# Needs EXPO_TOKEN in the repo-root .env.

MOBILE      := apps/mobile
EAS         := npx --yes eas-cli@latest
EXPO_TOKEN  := $(shell sed -n 's/^EXPO_TOKEN=//p' .env | tr -d '"'\'' \r')

export EXPO_TOKEN

PROJECT_ID  := 2946ef0e-73ec-4310-8007-71faa4867413
DASHBOARD   := https://expo.dev/projects/$(PROJECT_ID)/hosting/deployments

.PHONY: help whoami export deploy deploy-prod sync sync-prod dashboard clean-web

help:
	@echo "Web deploy (no EAS Build, no build credits):"
	@echo "  make sync         export + deploy to a fresh preview URL"
	@echo "  make sync-prod    export + deploy to https://courtpot.expo.app"
	@echo "  make export       bundle the web app into $(MOBILE)/dist only"
	@echo "  make deploy       upload the existing dist to a preview URL"
	@echo "  make deploy-prod  upload the existing dist and promote to production"
	@echo "  make dashboard    open the EAS Hosting deployments dashboard"
	@echo "  make whoami       check the Expo token"
	@echo "  make clean-web    delete $(MOBILE)/dist"

# Fails loudly rather than deploying anonymously if the token is missing.
whoami:
ifeq ($(strip $(EXPO_TOKEN)),)
	$(error EXPO_TOKEN is not set in .env)
endif
	@cd $(MOBILE) && $(EAS) whoami

export:
	cd $(MOBILE) && npx expo export --platform web

# `eas deploy` uploads whatever is already in dist, so always export first.
deploy: export
	cd $(MOBILE) && $(EAS) deploy --non-interactive --dev-domain courtpot

deploy-prod: export
	cd $(MOBILE) && $(EAS) deploy --prod --non-interactive

sync: deploy
sync-prod: deploy-prod

# eas-cli has no deployment-list command; the dashboard is the only listing.
dashboard:
	@echo "$(DASHBOARD)"
	@open "$(DASHBOARD)" 2>/dev/null || true

clean-web:
	rm -rf $(MOBILE)/dist
