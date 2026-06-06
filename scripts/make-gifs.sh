#!/bin/bash
# Converts Playwright-recorded MP4s to optimized GIFs.
# Requires: ffmpeg (brew install ffmpeg)

set -e

VIDEOS_DIR="docs/screenshots/videos"
GIFS_DIR="docs/screenshots/gifs"

if ! command -v ffmpeg &> /dev/null; then
  echo "Error: ffmpeg is required. Install with: brew install ffmpeg"
  exit 1
fi

mkdir -p "$GIFS_DIR"

for video in "$VIDEOS_DIR"/*.mp4 "$VIDEOS_DIR"/*.webm; do
  [ -f "$video" ] || continue
  ext="${video##*.}"
  name=$(basename "$video" ".$ext")
  echo "Converting $name.$ext → $name.gif"
  ffmpeg -y -i "$video" \
    -vf "fps=20,scale=393:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
    -loop 0 \
    "$GIFS_DIR/$name.gif"
done

echo "GIFs written to $GIFS_DIR"
