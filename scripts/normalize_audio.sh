#!/usr/bin/env bash
set -euo pipefail

INPUT_DIR="audio"
IN_PLACE=true
STATE_FILE=""
TARGET_I="-16"
TARGET_TP="-1.5"
TARGET_LRA="11"
DRY_RUN=false

usage() {
  cat <<USAGE
Normalize audio files with ffmpeg loudnorm (2-pass).

Usage:
  scripts/normalize_audio.sh [options]

Options:
  --input-dir <dir>      Input directory (default: audio)
  --target-i <value>     Integrated loudness in LUFS (default: -16)
  --target-tp <value>    True peak in dBTP (default: -1.5)
  --target-lra <value>   Loudness range (default: 11)
  --dry-run              Show what would be processed
  -h, --help             Show this help

Behavior:
  - In-place normalization (replaces original files)
  - Safe to rerun: already normalized/unchanged files are skipped using a state file
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input-dir)
      INPUT_DIR="$2"
      shift 2
      ;;
    --target-i)
      TARGET_I="$2"
      shift 2
      ;;
    --target-tp)
      TARGET_TP="$2"
      shift 2
      ;;
    --target-lra)
      TARGET_LRA="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Error: ffmpeg is not installed or not in PATH." >&2
  echo "Install first (macOS): brew install ffmpeg" >&2
  exit 1
fi

if [[ ! -d "$INPUT_DIR" ]]; then
  echo "Error: input directory '$INPUT_DIR' not found." >&2
  exit 1
fi

STATE_FILE="$INPUT_DIR/.loudnorm-state.tsv"
PROFILE="I=${TARGET_I};TP=${TARGET_TP};LRA=${TARGET_LRA};v=1"
touch "$STATE_FILE"

hash_file() {
  local f="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$f" | awk '{print $1}'
  else
    openssl dgst -sha256 "$f" | awk '{print $NF}'
  fi
}

state_get() {
  local rel="$1"
  awk -F'\t' -v r="$rel" '$1==r {print $2 "\t" $3}' "$STATE_FILE" | tail -n 1
}

state_set() {
  local rel="$1"
  local hash="$2"
  local profile="$3"
  local tmp
  tmp=$(mktemp)
  awk -F'\t' -v r="$rel" '$1!=r' "$STATE_FILE" > "$tmp"
  printf '%s\t%s\t%s\n' "$rel" "$hash" "$profile" >> "$tmp"
  mv "$tmp" "$STATE_FILE"
}

extract_json_value() {
  local key="$1"
  local file="$2"
  sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\{0,1\}\([^\",}]*\)\"\{0,1\}.*/\1/p" "$file" | tail -n 1
}

codec_args_for_ext() {
  local ext="$1"
  case "$ext" in
    mp3) echo "-c:a libmp3lame -q:a 2" ;;
    wav) echo "-c:a pcm_s16le" ;;
    m4a|aac) echo "-c:a aac -b:a 192k" ;;
    flac) echo "-c:a flac" ;;
    ogg) echo "-c:a libvorbis -q:a 5" ;;
    *) echo "-c:a libmp3lame -q:a 2" ;;
  esac
}

processed=0
skipped=0
failed=0

while IFS= read -r -d '' input_file; do
  rel_path="${input_file#${INPUT_DIR}/}"
  ext="${input_file##*.}"
  # macOS ships with bash 3.2, which does not support ${var,,}
  ext=$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')

  if ! current_hash=$(hash_file "$input_file"); then
    echo "[error] could not hash input file: $input_file" >&2
    failed=$((failed + 1))
    continue
  fi
  existing_state=$(state_get "$rel_path" || true)
  existing_hash="${existing_state%%$'\t'*}"
  existing_profile="${existing_state#*$'\t'}"

  if [[ "$existing_hash" == "$current_hash" && "$existing_profile" == "$PROFILE" ]]; then
    echo "[skip] $rel_path (already normalized for this profile)"
    skipped=$((skipped + 1))
    continue
  fi

  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] would normalize: $rel_path"
    processed=$((processed + 1))
    continue
  fi

  echo "[norm] $rel_path"
  pass1_log=$(mktemp)
  # BSD/macOS mktemp behavior is stricter with templates/suffixes.
  # Create a unique base temp file and append extension explicitly.
  tmp_base=$(mktemp "${TMPDIR:-/tmp}/loudnorm.XXXXXX")
  output_tmp="${tmp_base}.${ext}"
  rm -f "$tmp_base"

  if ! ffmpeg -hide_banner -nostdin -nostats -y \
      -i "$input_file" \
      -af "loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:print_format=json" \
      -f null - 2> "$pass1_log"; then
    echo "[error] pass1 failed: $rel_path" >&2
    rm -f "$pass1_log" "$output_tmp"
    failed=$((failed + 1))
    continue
  fi

  measured_i=$(extract_json_value "input_i" "$pass1_log")
  measured_lra=$(extract_json_value "input_lra" "$pass1_log")
  measured_tp=$(extract_json_value "input_tp" "$pass1_log")
  measured_thresh=$(extract_json_value "input_thresh" "$pass1_log")
  target_offset=$(extract_json_value "target_offset" "$pass1_log")

  if [[ -z "$measured_i" || -z "$measured_lra" || -z "$measured_tp" || -z "$measured_thresh" || -z "$target_offset" ]]; then
    echo "[error] could not parse loudnorm pass1 metrics: $rel_path" >&2
    rm -f "$pass1_log" "$output_tmp"
    failed=$((failed + 1))
    continue
  fi

  codec_args=$(codec_args_for_ext "$ext")

  if ! ffmpeg -hide_banner -nostdin -nostats -y \
      -i "$input_file" \
      -af "loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:measured_I=${measured_i}:measured_LRA=${measured_lra}:measured_TP=${measured_tp}:measured_thresh=${measured_thresh}:offset=${target_offset}:linear=true:print_format=summary" \
      -map_metadata 0 \
      $codec_args \
      "$output_tmp"; then
    echo "[error] pass2 failed: $rel_path" >&2
    rm -f "$pass1_log" "$output_tmp"
    failed=$((failed + 1))
    continue
  fi

  mv "$output_tmp" "$input_file"
  rm -f "$pass1_log"

  if ! new_hash=$(hash_file "$input_file"); then
    echo "[error] normalized file written but hash failed: $input_file" >&2
    failed=$((failed + 1))
    continue
  fi
  state_set "$rel_path" "$new_hash" "$PROFILE"
  processed=$((processed + 1))
done < <(find "$INPUT_DIR" -type f \( -iname '*.mp3' -o -iname '*.wav' -o -iname '*.m4a' -o -iname '*.aac' -o -iname '*.flac' -o -iname '*.ogg' \) -print0)

echo ""
echo "Done. processed=$processed skipped=$skipped failed=$failed"
if [[ "$failed" -gt 0 ]]; then
  exit 1
fi
