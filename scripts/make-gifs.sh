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

for mp4 in "$VIDEOS_DIR"/*.mp4; do
  [ -f "$mp4" ] || continue
  name=$(basename "$mp4" .mp4)
  echo "Converting $name.mp4 → $name.gif"
  ffmpeg -y -i "$mp4" \
    -vf "fps=20,scale=393:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
    -loop 0 \
    "$GIFS_DIR/$name.gif"
done

echo "GIFs written to $GIFS_DIR"
