#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/outputs/sps_sim.cpp"
BIN="$ROOT/outputs/sps_sim"

c++ -std=c++17 -Wall -Wextra -Werror -pedantic "$SRC" -o "$BIN"

pose_out="$("$BIN" pose)"
grep -F "state: arm1=90.000 arm2=90.000 arm3=90.000 offset=0.000 base=180.000" <<<"$pose_out"
grep -F "tool_center: x=2596.265 y=0.000 z=998.536" <<<"$pose_out"
grep -F "displayed_tip: x=-2359.749 y=-262.000 z=998.536" <<<"$pose_out"
grep -F "linkage_A_common: x=-226.672 y=0.000 z=3695.359 error=0.000" <<<"$pose_out"
grep -F "linkage_B_common: x=2463.741 y=0.000 z=3606.735 error=0.000" <<<"$pose_out"

clamp_out="$("$BIN" pose -10 300 91 -400 361)"
grep -F "state: arm1=0.000 arm2=180.000 arm3=91.000 offset=-270.000 base=180.000" <<<"$clamp_out"

stroke_out="$("$BIN" stroke 1 0 0.5)"
grep -F "state: arm1=120.000 arm2=180.000 arm3=90.000 offset=0.000 base=180.000" <<<"$stroke_out"

linear_out="$("$BIN" linear 380.258 -2478.007 998.536)"
grep -F "reachable: yes" <<<"$linear_out"
grep -F "state: arm1=89.978 arm2=90.000 arm3=90.000 offset=0.000 base=90.011" <<<"$linear_out"

path_out="$("$BIN" path -2359.749 -262.000 998.536 -1559.749 -262.000 998.536 50)"
grep -F "path_distance: 800.000" <<<"$path_out"
grep -F "path_progress: 50.000" <<<"$path_out"

echo "sps_sim C++ tests passed"
