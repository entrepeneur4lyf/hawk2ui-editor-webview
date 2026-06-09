#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Linux system dependencies are only needed on Linux."
  exit 0
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This setup script currently supports Debian/Ubuntu systems with apt-get." >&2
  exit 1
fi

if [[ "${EUID}" -eq 0 ]]; then
  sudo_cmd=()
elif command -v sudo >/dev/null 2>&1; then
  sudo_cmd=(sudo)
else
  echo "Installing Linux system dependencies requires root privileges or sudo." >&2
  exit 1
fi

deps=(
  pkg-config
  libwebkit2gtk-4.1-dev
  libxdo-dev
)

"${sudo_cmd[@]}" apt-get update
"${sudo_cmd[@]}" env DEBIAN_FRONTEND=noninteractive apt-get install -y "${deps[@]}"
