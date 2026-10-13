#!/usr/bin/env bash
# Installed root-owned at /usr/local/sbin/wardrobe-ci-command.
set -Eeuo pipefail
command=${SSH_ORIGINAL_COMMAND:-}
if [[ $command =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  exec sudo -n /usr/local/sbin/wardrobe-deploy "${BASH_REMATCH[1]}"
fi
echo 'Only deploy <full-commit-sha> is permitted.' >&2
exit 2
