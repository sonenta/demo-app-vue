#!/usr/bin/env bash
# deploy.sh — build the Vue demo locally and rsync dist/ to sonenta-web.
#
# Native deploy pattern (parité avec website/scripts/deploy.sh):
#   Box   : sonenta@sonenta-web
#   Root  : /data/clients/sonenta/sonenta.com/demos/vue
#   Layout: FLAT DOCROOT (case B) — nginx vhost sonenta.com has a SPA
#           fallback for /demos/vue/ (owned by website task α). We rsync
#           dist/ straight into $DEPLOY_ROOT with --delete; the live
#           sub-app is replaced file-by-file. Acceptable for an SPA at
#           this scale: the index + chunks are hashed and the worst
#           case is a sub-second window where a stale index references
#           a new chunk (auto-recovers on next reload).
#
# No Docker, no GitHub Actions — build runs HERE, rsync to the box.
# nginx + certbot are already configured. There are no build-time env
# secrets (the SDK ships a public demo key in main.ts).
#
# Preflights (run before anything else):
#   1. SSH reachability of DEPLOY_SSH_HOST
#   2. Git repo + branch=main + clean tree + in sync with origin/main
#
# Usage:
#   ./scripts/deploy.sh                # build + rsync to flat docroot
#   ./scripts/deploy.sh --pull         # if HEAD is behind origin/main, ff-only pull
#   ./scripts/deploy.sh --force-dirty  # deploy even with uncommitted changes (warn)
#   ./scripts/deploy.sh --dry-run      # show what would happen, do nothing
#
# Optional env (sane defaults below):
#   DEPLOY_SSH_HOST   (default: sonenta@sonenta-web)
#   DEPLOY_ROOT       (default: /data/clients/sonenta/sonenta.com/demos/vue)
#
# A deploy/.env.production.local file (gitignored) is loaded if present.

set -euo pipefail

# ---- args ----------------------------------------------------------------
DRY_RUN=0
DO_PULL=0
FORCE_DIRTY=0
for arg in "$@"; do
    case "$arg" in
        --dry-run)      DRY_RUN=1 ;;
        --pull)         DO_PULL=1 ;;
        --force-dirty)  FORCE_DIRTY=1 ;;
        -h|--help)
            sed -n '2,34p' "$0"; exit 0 ;;
        *) echo "deploy: unknown arg '$arg'" >&2; exit 2 ;;
    esac
done

run() {
    if [[ $DRY_RUN -eq 1 ]]; then
        echo "+ $*"
    else
        eval "$@"
    fi
}

# ---- locate repo ---------------------------------------------------------
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
cd "$REPO_DIR"

if [[ ! -f package.json ]] || ! grep -q '"@sonenta/demo-app-vue"' package.json; then
    echo "deploy: not in demo-app-vue repo root (cwd=$REPO_DIR)" >&2
    exit 2
fi

# ---- preflight 1 — SSH reachability --------------------------------------
: "${DEPLOY_SSH_HOST:=sonenta@sonenta-web}"

echo "==> preflight: ssh $DEPLOY_SSH_HOST"
# BatchMode=yes: never prompt (auth must come from agent/key, not interactive).
# ConnectTimeout=5: fail fast on DNS/network issues.
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$DEPLOY_SSH_HOST" 'true' 2>/dev/null; then
    echo "deploy: SSH $DEPLOY_SSH_HOST injoignable. Vérifie ta clé / l'agent SSH avant de relancer." >&2
    exit 2
fi

# ---- preflight 2 — git state ---------------------------------------------
echo "==> preflight: git"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "deploy: not a git repository" >&2
    exit 2
fi

GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$GIT_BRANCH" != "main" ]]; then
    echo "deploy: current branch is '$GIT_BRANCH', expected 'main'." >&2
    echo "        Run \`git switch main\` and try again." >&2
    exit 2
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
    if [[ $FORCE_DIRTY -eq 1 ]]; then
        echo "deploy: WARNING — working tree is DIRTY but --force-dirty was passed." >&2
        echo "        Uncommitted changes will NOT be in git history." >&2
    else
        echo "deploy: working tree is dirty (uncommitted changes)." >&2
        echo "        Commit/stash them, or re-run with --force-dirty to ignore." >&2
        exit 2
    fi
fi

if ! git fetch --quiet origin main; then
    echo "deploy: \`git fetch origin main\` failed — check your network/origin." >&2
    exit 2
fi

LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse origin/main)
AHEAD=$(git rev-list --count origin/main..HEAD)
BEHIND=$(git rev-list --count HEAD..origin/main)

if [[ "$LOCAL_SHA" == "$REMOTE_SHA" ]]; then
    : # up to date
elif [[ $BEHIND -gt 0 && $AHEAD -eq 0 ]]; then
    if [[ $DO_PULL -eq 1 ]]; then
        echo "    HEAD is $BEHIND commit(s) behind origin/main — pulling (ff-only)…"
        run "git pull --ff-only origin main"
    else
        echo "deploy: HEAD is $BEHIND commit(s) behind origin/main." >&2
        echo "        Run \`git pull origin main\` or re-run with --pull." >&2
        exit 2
    fi
elif [[ $AHEAD -gt 0 && $BEHIND -eq 0 ]]; then
    echo "    HEAD is $AHEAD commit(s) ahead of origin/main — deploying local commits."
else
    echo "    HEAD has diverged from origin/main ($AHEAD ahead, $BEHIND behind) — deploying local HEAD anyway."
fi

GIT_SHA=$(git rev-parse --short=12 HEAD)
echo "    Déploiement depuis commit $GIT_SHA branch main"

# ---- load operator env (gitignored, optional) ----------------------------
ENV_FILE="$REPO_DIR/deploy/.env.production.local"
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a; . "$ENV_FILE"; set +a
fi

# ---- defaults ------------------------------------------------------------
: "${DEPLOY_ROOT:=/data/clients/sonenta/sonenta.com/demos/vue}"

# ---- pick package manager ------------------------------------------------
if [[ -f pnpm-lock.yaml ]]; then
    if ! command -v pnpm >/dev/null 2>&1; then
        echo "deploy: pnpm not on PATH (repo uses pnpm-lock.yaml)" >&2; exit 2
    fi
    INSTALL=(pnpm install --frozen-lockfile)
    BUILD=(pnpm run build)
elif [[ -f package-lock.json ]]; then
    INSTALL=(npm ci)
    BUILD=(npm run build)
else
    echo "deploy: no lockfile (need package-lock.json or pnpm-lock.yaml)" >&2; exit 2
fi

# ---- build (in a throwaway worktree pinned to $GIT_SHA) -------------------
# We do NOT build from the working tree. A working-tree build ships your commit
# PLUS whatever is lying around uncommitted — demo-app nearly put another peer's
# half-built LoginForm on the live marketing page that way, and nothing flags it
# (build green, rsync clean, site 200). Building a clean checkout of $GIT_SHA
# makes the artifact ADDRESSABLE BY A COMMIT: --force-dirty can still let you
# deploy from a dirty tree, but stray code cannot reach the artifact.
BUILD_DIR=$(mktemp -d "${TMPDIR:-/tmp}/demo-app-vue-deploy.XXXXXX")
cleanup() {
    git worktree remove --force "$BUILD_DIR" >/dev/null 2>&1 || rm -rf "$BUILD_DIR"
}
trap cleanup EXIT

echo "==> checkout $GIT_SHA into a clean worktree"
run "git worktree add --detach --quiet '$BUILD_DIR' '$GIT_SHA'"

# A CLEAN CHECKOUT HAS NO GITIGNORED FILES — carry the operator env across
# explicitly. Omitting this silently drops build-time secrets (demo-app's clean
# checkout re-introduced `Authorization: ApiKey undefined`, reintroducing an
# already-fixed bug via the fix for a different one). We have no env file today;
# this is here so adding one later cannot break the deploy silently.
if [[ -f "$ENV_FILE" ]]; then
    echo "    carrying $(basename "$ENV_FILE") into the clean checkout"
    run "mkdir -p '$BUILD_DIR/deploy' && cp '$ENV_FILE' '$BUILD_DIR/deploy/'"
fi

echo "==> install"
run "cd '$BUILD_DIR' && ${INSTALL[*]}"

echo "==> build (sha=$GIT_SHA, branch=$GIT_BRANCH)"
run "cd '$BUILD_DIR' && ${BUILD[*]}"

DIST="$BUILD_DIR/dist"
if [[ $DRY_RUN -eq 0 ]] && { [[ ! -d "$DIST" ]] || [[ ! -f "$DIST/index.html" ]]; }; then
    echo "deploy: dist/ missing or empty after build" >&2; exit 1
fi

# Stamp the bundle with the source commit so `curl /version.txt` confirms
# what's actually live.
TS=$(date -u +%Y%m%d-%H%M%SZ)
printf '%s\n%s\n%s\n' "$GIT_SHA" "$GIT_BRANCH" "$TS" > "$DIST/version.txt"

# ---- push ----------------------------------------------------------------
echo "==> rsync → $DEPLOY_SSH_HOST:$DEPLOY_ROOT/"
# Flat docroot at $DEPLOY_ROOT (which is the demos/vue subtree, fully
# owned by this peer — no excludes needed). --delete drops stale files
# from previous builds. Trailing slash on dist/ copies the CONTENTS.
run "rsync -avz --delete --human-readable '$DIST/' '$DEPLOY_SSH_HOST:$DEPLOY_ROOT/'"

echo
echo "Deployed."
echo "  URL    : https://sonenta.com/demos/vue/"
echo "  Commit : $GIT_SHA ($GIT_BRANCH)"
echo "  Target : $DEPLOY_SSH_HOST:$DEPLOY_ROOT"
echo "  Stamp  : $TS (curl https://sonenta.com/demos/vue/version.txt to verify)"
