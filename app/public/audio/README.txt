// AVATAR VOICE FILES //

Drop .mp3 files here. You can have multiple lines per avatar — one is picked
at random each time the avatar is selected.

NAMING:
  Multi-line  → aatrox-1.mp3, aatrox-2.mp3, aatrox-3.mp3 ... up to aatrox-8.mp3
  Single-line → aatrox.mp3   (used as fallback if no numbered files)

  You can mix both. All existing files are pooled. Empty slots are skipped.
  The intro probes for files at page load — refresh to pick up new files.

SUPPORTED AVATAR NAMES:
  aatrox.mp3 / aatrox-1.mp3 / aatrox-2.mp3 / ...
  druid.mp3  / druid-1.mp3  / druid-2.mp3  / ...
  kratos.mp3 / kratos-1.mp3 / kratos-2.mp3 / ...
  gun.mp3    / gun-1.mp3    / gun-2.mp3    / ...
  ichigo.mp3 / ichigo-1.mp3 / ichigo-2.mp3 / ...

LIMITS:
  - Up to 8 numbered lines per avatar (you can change MAX_LINES_PER_AVATAR
    in app/index.html if you want more).
  - 1-3 seconds per clip is ideal. MP3 at 128kbps mono is plenty.
  - Missing files silently no-op — won't break the intro.

SOURCES (legal-ish, personal use):
  - 101soundboards.com — game/anime soundboards
  - myinstants.com — short clips
  - Voicy — community soundboard
  - yt-dlp + ffmpeg trim from YouTube

VIBE SUGGESTIONS:
  aatrox  → "I am the wraith of obliteration!" / "Surrender to me!" / dark laugh
  druid   → primal nature growl / shapeshift sound / wind howl
  kratos  → "BOY." / war horn / "Hades!" / spartan grunt
  gun     → cigarette flick + cold line / gun cock / "tch."
  ichigo  → "Bankai!" / "Getsuga Tensho!" / hollow roar / Vasto growl
