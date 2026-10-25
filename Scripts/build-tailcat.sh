#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TAILCAT_VERSION="${TAILCAT_VERSION:-v0.7.0}"
export GOTOOLCHAIN=auto

BUILD_NATIVE=1
BUILD_WASM=1

for arg in "$@"; do
  case "$arg" in
    --native-only)
      BUILD_WASM=0
      ;;
    --wasm-only)
      BUILD_NATIVE=0
      ;;
  esac
done

# Tailscale feature omit tags from github.com/tailscale/tailcat/build-tags.txt
RELEASE_TAGS="ts_omit_ace,ts_omit_acme,ts_omit_advertiseexitnode,ts_omit_advertiseroutes,ts_omit_appconnectors,ts_omit_aws,ts_omit_bird,ts_omit_cachenetmap,ts_omit_captiveportal,ts_omit_capture,ts_omit_cliconndiag,ts_omit_clientmetrics,ts_omit_clientupdate,ts_omit_cloud,ts_omit_colorable,ts_omit_completion,ts_omit_completion_scripts,ts_omit_conn25,ts_omit_connreject,ts_omit_debug,ts_omit_debugeventbus,ts_omit_debugportmapper,ts_omit_desktop_sessions,ts_omit_dns,ts_omit_dnsresolvecache,ts_omit_doctor,ts_omit_drive,ts_omit_favorites,ts_omit_flashappliance,ts_omit_health,ts_omit_hujsonconf,ts_omit_identityfederation,ts_omit_ipnbus,ts_omit_iptables,ts_omit_kube,ts_omit_linkspeed,ts_omit_linuxdnsfight,ts_omit_listenrawdisco,ts_omit_logtail,ts_omit_netlog,ts_omit_networkmanager,ts_omit_oauthkey,ts_omit_osrouter,ts_omit_outboundproxy,ts_omit_peerapiclient,ts_omit_peerapiserver,ts_omit_portlist,ts_omit_portmapper,ts_omit_posture,ts_omit_qrcodes,ts_omit_relayserver,ts_omit_remoteconfig,ts_omit_resolved,ts_omit_routecheck,ts_omit_runtimemetrics,ts_omit_sdnotify,ts_omit_serve,ts_omit_serviceclientprefs,ts_omit_synology,ts_omit_syslog,ts_omit_syspolicy,ts_omit_systray,ts_omit_taildrop,ts_omit_tailnetlock,ts_omit_tap,ts_omit_tpm,ts_omit_tundevstats,ts_omit_unixsocketidentity,ts_omit_useexitnode,ts_omit_useproxy,ts_omit_usermetrics,ts_omit_useroutes,ts_omit_wakeonlan,ts_omit_webbrowser,ts_omit_webclient"

# Wasm builds only need netstack and omit native UDP/SSH server features
WASM_TAGS="${RELEASE_TAGS},ts_omit_androidbin,ts_omit_bakedroots,ts_omit_c2n,ts_omit_dbus,ts_omit_gro,ts_omit_nattraversal,ts_omit_ssh,ts_omit_udptransport"

if [ "${BUILD_NATIVE}" -eq 1 ]; then
  echo "Building Universal macOS tailcat binary (${TAILCAT_VERSION})..."
  mkdir -p "${ROOT_DIR}/Resources"
  TMP_BUILD_DIR="$(mktemp -d)"
  trap 'rm -rf "${TMP_BUILD_DIR}"' EXIT

  pushd "${ROOT_DIR}/dash/wasm" > /dev/null
  go mod tidy

  echo "  -> Compiling tailcat for darwin/arm64..."
  CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build \
    -tags "${RELEASE_TAGS}" \
    -ldflags="-s -w" \
    -o "${TMP_BUILD_DIR}/tailcat_arm64" \
    ./cmd/tailcat

  echo "  -> Compiling tailcat for darwin/amd64..."
  CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build \
    -tags "${RELEASE_TAGS}" \
    -ldflags="-s -w" \
    -o "${TMP_BUILD_DIR}/tailcat_amd64" \
    ./cmd/tailcat

  popd > /dev/null

  echo "  -> Merging into Universal Binary Resources/tailcat..."
  lipo -create \
    "${TMP_BUILD_DIR}/tailcat_arm64" \
    "${TMP_BUILD_DIR}/tailcat_amd64" \
    -output "${ROOT_DIR}/Resources/tailcat"
  chmod +x "${ROOT_DIR}/Resources/tailcat"
  echo "✅ Built Universal Binary: ${ROOT_DIR}/Resources/tailcat"
fi

if [ "${BUILD_WASM}" -eq 1 ]; then
  echo "Building Tailcat + SSH Client WebAssembly module..."
  TERMINAL_PUBLIC_DIR="${ROOT_DIR}/dash/public/terminal"
  mkdir -p "${TERMINAL_PUBLIC_DIR}"

  pushd "${ROOT_DIR}/dash/wasm" > /dev/null
  go mod tidy

  GOROOT_PATH="$(GOOS=js GOARCH=wasm go env GOROOT)"
  rm -f "${TERMINAL_PUBLIC_DIR}/wasm_exec.js"
  if [ -f "${GOROOT_PATH}/lib/wasm/wasm_exec.js" ]; then
    cp "${GOROOT_PATH}/lib/wasm/wasm_exec.js" "${TERMINAL_PUBLIC_DIR}/wasm_exec.js"
  elif [ -f "${GOROOT_PATH}/misc/wasm/wasm_exec.js" ]; then
    cp "${GOROOT_PATH}/misc/wasm/wasm_exec.js" "${TERMINAL_PUBLIC_DIR}/wasm_exec.js"
  else
    echo "Error: Could not find wasm_exec.js in ${GOROOT_PATH}" >&2
    exit 1
  fi
  chmod 644 "${TERMINAL_PUBLIC_DIR}/wasm_exec.js"

  GOOS=js GOARCH=wasm go build \
    -tags "${WASM_TAGS}" \
    -ldflags="-s -w" \
    -o "${TERMINAL_PUBLIC_DIR}/tailcat.wasm" \
    .

  gzip -9 -f -k "${TERMINAL_PUBLIC_DIR}/tailcat.wasm"
  rm -f "${TERMINAL_PUBLIC_DIR}/tailcat.wasm"
  popd > /dev/null

  echo "✅ Built Wasm assets in ${TERMINAL_PUBLIC_DIR}:"
  ls -lh "${TERMINAL_PUBLIC_DIR}"
fi
