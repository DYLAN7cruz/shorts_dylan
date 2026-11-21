"""
Pure helpers for the Gemini clip-selection pipeline.

Standard-library only so both main.py and gemini_worker.py can import it and
the logic stays unit-testable without the heavy video dependencies.
"""
import math

# USD per 1M tokens (input, output incl. thinking), from ai.google.dev pricing.
MODEL_PRICES = {
    "gemini-3.5-flash": (1.50, 9.00),
    "gemini-3.1-flash-lite": (0.25, 1.50),
    "gemini-3-flash-preview": (0.50, 3.00),
    "gemini-2.5-flash-lite": (0.10, 0.40),
    "gemini-2.5-flash": (0.30, 2.50),
    "gemini-2.0-flash": (0.10, 0.40),  # deprecated (shut down 2026-06-01)
}


def lookup_model_prices(model_name):
    """Longest-prefix match against MODEL_PRICES; None if unknown."""
    name = str(model_name or "").lower()
    best_key = None
    for key in MODEL_PRICES:
        if name.startswith(key) and (best_key is None or len(key) > len(best_key)):
            best_key = key
    return MODEL_PRICES[best_key] if best_key else None


def clip_count_targets(n_windows, video_duration=None):
    """How many clips to ask the detail pass for, given the shortlist size and video duration.
    Scales dynamically to deliver a rich set of standalone viral clips:
    - 5 to 10 min: 5 to 8 clips
    - 15 to 30 min: 10 to 15 clips
    - 45 to 60+ min: 18 to 26 clips

    ``CLIP_TARGET_MIN`` / ``CLIP_TARGET_MAX`` override both if set via env.
    """
    import os

    n = max(1, int(n_windows or 1))
    if video_duration:
        try:
            mins = max(1.0, float(video_duration) / 60.0)
            # 10 min -> low 5, high 8
            # 30 min -> low 11, high 16
            # 60 min -> low 20, high 28
            low = max(4, int(round(mins * 0.32 + 2)))
            high = max(low + 2, int(round(mins * 0.44 + 4)))
            low = min(low, 26)
            high = min(high, 35)
        except (TypeError, ValueError):
            low = max(5, min(22, n // 2 + 3))
            high = min(32, max(8, int(n * 1.6)))
    else:
        low = max(5, min(22, n // 2 + 3))
        high = min(32, max(8, int(n * 1.6)))

    low = min(low, high)

    def _override(name, current):
        raw = os.environ.get(name)
        if not raw:
            return current
        try:
            return max(1, int(raw))
        except ValueError:
            return current

    low = _override("CLIP_TARGET_MIN", low)
    high = _override("CLIP_TARGET_MAX", high)
    return low, max(low, high)


def shortlist_target(video_duration):
    """How many scored windows the detail pass should get.

    Scales proportionally with video duration:
    - 5-10 min: 10-15 candidate windows
    - 20-30 min: 22-30 candidate windows
    - 45-60 min: 40-55 candidate windows
    """
    try:
        seconds = float(video_duration or 0)
    except (TypeError, ValueError):
        seconds = 0.0
    minutes = max(1.0, seconds / 60.0)
    return max(8, min(60, int(round(minutes * 0.75 + 6))))


def score_batches(windows, batch_size):
    """Split ``windows`` into near-equal scoring batches.

    Two things were wrong with the old ``range(0, n, batch_size)`` walk plus a
    prompt that said "choose up to 3 windows from this batch".

    The cap made the shortlist unreachable. Its real ceiling was
    ``3 * n_batches``, not ``shortlist_target``: measured 22-sep-2026 on a
    9:10 source, 9 windows batched 8 + 1 returned 3 + 1 = 4 windows against a
    target of 8. ``clip_count_targets`` then derives the clip floor from that
    halved shortlist, so the detail pass was asked for 4-8 clips instead of
    6-12 and the job delivered 4 (3 in prod on the same video). Every source
    under ~30 minutes was starved the same way, which is the mechanism behind
    "95% of jobs deliver 3 clips or fewer" — the clip count the retention
    curve hangs on (see clip_count_targets). The prompt now scores every
    window it is given and the shortlist is the global top ``target``, so the
    selection happens where the scores can actually be compared.

    Per-batch selection also threw away the ranking it was computing: a batch
    holding five great moments could only contribute three, while a batch of
    filler still contributed its own three.

    The remainder was its own bug: a trailing batch of one window came back
    with that window whatever its score, because a cap of 3 cannot filter a
    batch of 1 — the tail of the video entered the shortlist by arithmetic
    rather than merit (``window_009`` did exactly that on the measured run).
    Near-equal batches keep that from happening and also keep each score
    comparable, since a window judged alone is judged against nothing.
    """
    windows = list(windows or [])
    n = len(windows)
    if not n:
        return []
    size = max(1, int(batch_size or 1))
    n_batches = max(1, -(-n // size))       # ceil
    base, extra = divmod(n, n_batches)

    out = []
    start = 0
    for index in range(n_batches):
        take = base + (1 if index < extra else 0)
        batch = windows[start:start + take]
        start += take
        if batch:
            out.append(batch)
    return out


def trim_to_best(shorts, max_clips):
    """Cut an over-long detail-pass result down to ``max_clips`` BY SCORE.

    The detail pass hands its clips back in transcript order, batch after
    batch, so slicing the list keeps the EARLIEST clips rather than the best
    ones. On a 9-minute walkthrough that quietly threw away everything past
    minute three: the model proposed clips across the whole video, and the
    ones covering the demo, the MCP walkthrough and the close were the tail
    that got dropped. Worse, the failure scales the wrong way — the more
    generous the model is, the more of the video disappears.

    That sabotages the windowing: get_viral_clips builds scoring windows
    precisely because "a single call over the whole transcript clusters picks
    near the start", and a positional slice puts the clustering right back.

    Ranking is by ``predicted_score`` (the detail prompt already asks for it,
    and nothing else was reading it here). Ties keep transcript order, and the
    survivors come back in transcript order too, so clip numbering still runs
    front to back the way every caller downstream expects.
    """
    max_clips = max(1, int(max_clips or 1))
    if len(shorts) <= max_clips:
        return list(shorts)

    def score(item):
        try:
            return float(item[1].get("predicted_score") or 0)
        except (TypeError, ValueError, AttributeError):
            return 0.0

    indexed = list(enumerate(shorts))
    best = sorted(indexed, key=score, reverse=True)[:max_clips]
    return [item for _, item in sorted(best, key=lambda pair: pair[0])]


def vision_segments(video_duration, segment_seconds, max_segments):
    """Split a silent source into near-equal ``(start, end)`` stretches for
    the vision pass, each at most ``segment_seconds`` long.

    The vision pass sends Gemini the footage itself at ~300 tokens/second, so
    an hour (~1.08M tokens) no longer fits a 1M-token window and a silent
    multi-hour capture failed at the model. Near-equal stretches, not fixed
    ones: a 41-minute source split at 40 minutes would leave a one-minute
    tail that the prompt has to fill with 3+ clips. A source that fits in one
    stretch returns one stretch, so short videos take the single-upload path
    unchanged. Past ``max_segments`` the source is truncated (the caller logs
    it) rather than spending without bound on one job.
    """
    duration = max(0.0, float(video_duration or 0))
    seg = max(60.0, float(segment_seconds))
    if duration <= seg:
        return [(0.0, round(duration, 3))]
    n = int(math.ceil(duration / seg))
    n_kept = max(1, min(n, int(max_segments)))
    step = duration / n
    return [(round(i * step, 3), round(min(duration, (i + 1) * step), 3))
            for i in range(n_kept)]


def clip_duration_bounds():
    """The clip length band (seconds) the selection prompts and word-snapping
    enforce. ``CLIP_MIN_SECONDS`` / ``CLIP_MAX_SECONDS`` override the classic
    15-60 — set per job by /api/process when the user asks for a specific
    length, or by hand for A/B runs. Values are clamped to platform-sane
    limits and re-ordered so bad input degrades instead of breaking the job.
    """
    import os

    def _read(name, default):
        try:
            return float(os.environ.get(name, ""))
        except ValueError:
            return default

    lo = _read("CLIP_MIN_SECONDS", 15.0)
    hi = _read("CLIP_MAX_SECONDS", 60.0)
    lo = min(max(lo, 5.0), 175.0)
    hi = min(max(hi, 10.0), 180.0)
    if hi < lo + 5.0:  # keep a real band: degenerate ranges starve the model
        hi = min(180.0, lo + 5.0)
    return round(lo, 3), round(hi, 3)


def compact_words(words, precision=2):
    """Round word timestamps for prompts — full float precision wastes tokens."""
    return [
        {
            "w": w.get("w", ""),
            "s": round(float(w.get("s", 0)), precision),
            "e": round(float(w.get("e", 0)), precision),
        }
        for w in words
    ]


def build_transcript_windows(transcript_result, video_duration,
                             window_seconds=60, overlap_seconds=20):
    """
    Build scoring windows aligned to Whisper segment boundaries, so a sentence
    (and usually a viral moment) is never cut in half mid-window. Windows grow
    segment by segment to roughly window_seconds (up to 1.25x for the closing
    segment) and the next window starts ~overlap_seconds before the previous
    end, also snapped to a segment start.
    """
    segments = []
    for segment in transcript_result.get("segments", []):
        text = str(segment.get("text") or "").strip()
        if not text:
            continue
        segments.append((float(segment.get("start", 0)), float(segment.get("end", 0)), text))

    windows = []
    window_index = 1
    i = 0
    n = len(segments)
    while i < n:
        w_start = segments[i][0]
        j = i
        # Extend while the NEXT segment still fits within a tolerant cap, so the
        # window closes on a segment boundary near window_seconds.
        while j + 1 < n and segments[j + 1][1] - w_start <= window_seconds * 1.25:
            j += 1
            if segments[j][1] - w_start >= window_seconds:
                break
        w_end = segments[j][1]
        windows.append({
            "id": f"window_{window_index:03d}",
            "start": round(w_start, 3),
            "end": round(w_end, 3),
            "text": " ".join(seg[2] for seg in segments[i:j + 1]),
        })
        window_index += 1

        if j >= n - 1:
            break
        # Next window starts at the first segment beginning after (end - overlap),
        # but always makes progress.
        target = w_end - overlap_seconds
        k = i + 1
        while k <= j and segments[k][0] < target:
            k += 1
        i = max(k, i + 1)

    if not windows:
        windows.append({
            "id": "window_001",
            "start": 0.0,
            "end": round(float(video_duration), 3),
            "text": str(transcript_result.get("text", "") or ""),
        })
    return windows


def dedupe_overlapping(shorts, ratio=0.55):
    """Drop clips that overlap an already-kept clip by ``ratio`` of the
    shorter one, keeping the higher ``predicted_score`` (earlier on a tie).
    """
    def _score(c):
        try:
            return float(c.get("predicted_score") or 0)
        except (TypeError, ValueError, AttributeError):
            return 0.0

    def _span(c):
        try:
            return float(c.get("start", 0)), float(c.get("end", 0))
        except (TypeError, ValueError, AttributeError):
            return 0.0, 0.0

    indexed = list(enumerate(shorts))
    kept = []
    for idx, clip in sorted(indexed, key=lambda p: (-_score(p[1]), p[0])):
        s, e = _span(clip)
        clash = False
        for _, other in kept:
            os_, oe = _span(other)
            overlap = min(e, oe) - max(s, os_)
            shorter = max(1e-6, min(e - s, oe - os_))
            if overlap > 0 and overlap / shorter >= ratio:
                clash = True
                break
        if not clash:
            kept.append((idx, clip))
    return [c for _, c in sorted(kept, key=lambda p: p[0])]


DISCOURSE_CONNECTORS = {
    "y", "e", "entonces", "pero", "bueno", "pues", "o sea", "osea",
    "así", "asi", "después", "despues", "luego", "porque", "por eso",
    "además", "ademas", "también", "tambien", "so", "and", "but", "then"
}

SENTENCE_END_PUNCT = ('.', '?', '!', '...', '…', '?!', '!?')


def is_sentence_ender(word_dict, next_word_dict=None):
    text = str(word_dict.get("w", "")).strip()
    if text.endswith(SENTENCE_END_PUNCT):
        return True
    if next_word_dict:
        gap = float(next_word_dict.get("s", 0)) - float(word_dict.get("e", 0))
        if gap >= 0.38:
            return True
    return False


def is_sentence_starter(words, idx):
    if idx == 0:
        return True
    prev = words[idx - 1]
    curr = words[idx]
    if is_sentence_ender(prev, curr):
        return True
    gap = float(curr.get("s", 0)) - float(prev.get("e", 0))
    if gap >= 0.38:
        return True
    return False


def snap_clip_to_words(start, end, words, video_duration,
                       min_duration=15.0, max_duration=60.0,
                       search_window=2.0, max_lead=0.35, max_tail=0.45):
    """
    Snap Gemini-proposed clip boundaries onto real sentence and word boundaries.
    Prioritizes complete grammatical thoughts:
    - Starts on a true sentence opener (after punctuation or natural pause),
      cleaning up weak discourse connectors ("y", "bueno", "entonces").
    - Ends on a complete sentence conclusion (punctuation or pause), preventing
      abrupt mid-sentence cuts.
    - Smoothly pads into surrounding silence without bleeding adjacent words.
    """
    original = (round(float(start), 3), round(float(end), 3))
    if not words:
        return original

    starts = [float(w.get("s", 0)) for w in words]
    ends = [float(w.get("e", 0)) for w in words]
    new_start = float(start)
    new_end = float(end)

    # 1. START: Find the best sentence starter near new_start
    # Check within search_window (expand up to 3.5s for sentence boundaries)
    window_s = max(search_window, 3.5)
    nearby_start = [i for i, s in enumerate(starts) if abs(s - new_start) <= window_s]
    if not nearby_start:
        candidates = [i for i, s in enumerate(starts) if abs(s - new_start) <= search_window]
        if not candidates:
            return original
        best_start_idx = min(candidates, key=lambda i: abs(starts[i] - new_start))
    else:
        starters = [i for i in nearby_start if is_sentence_starter(words, i)]
        if starters:
            best_start_idx = min(starters, key=lambda i: abs(starts[i] - new_start))
        else:
            best_start_idx = min(nearby_start, key=lambda i: abs(starts[i] - new_start))

    # Guard: if best_start_idx landed on a word that ends a sentence (e.g. 'radio!'),
    # advance to the next word so we don't open on the tail of a previous thought
    if is_sentence_ender(words[best_start_idx]) and best_start_idx + 1 < len(words):
        if starts[best_start_idx + 1] - new_start <= 3.0:
            best_start_idx += 1

    # Advance past weak discourse connectors ("entonces", "y", "bueno", "o sea")
    while best_start_idx < len(words) - 1:
        w_text = str(words[best_start_idx].get("w", "")).strip().lower().rstrip(",.?!:;")
        if w_text in DISCOURSE_CONNECTORS and (starts[best_start_idx + 1] - ends[best_start_idx] < 0.35):
            best_start_idx += 1
        else:
            break

    word_start = starts[best_start_idx]
    prev_ends = [e for e in ends if e <= word_start]
    gap_before = max(0.0, word_start - max(prev_ends)) if prev_ends else max_lead
    lead = min(max_lead, gap_before / 2)
    snapped_start = max(0.0, word_start - lead)

    # 2. END: Find the best sentence ender near new_end
    # Look around new_end (e.g. -3.5s to +3.5s) for a clean sentence conclusion
    window_e = max(search_window, 3.5)
    candidates_end = [
        j for j in range(best_start_idx, len(words))
        if abs(ends[j] - new_end) <= window_e and (min_duration - 1.0 <= ends[j] - snapped_start <= max_duration + 0.5)
    ]

    best_end_idx = None
    if candidates_end:
        enders = [j for j in candidates_end if is_sentence_ender(words[j], words[j+1] if j+1 < len(words) else None)]
        if enders:
            best_end_idx = min(enders, key=lambda j: abs(ends[j] - new_end))
        else:
            best_end_idx = min(candidates_end, key=lambda j: abs(ends[j] - new_end))
    else:
        raw_candidates = [i for i, e in enumerate(ends) if abs(e - new_end) <= search_window]
        if raw_candidates:
            best_end_idx = min(raw_candidates, key=lambda i: abs(ends[i] - new_end))
        else:
            valid = [j for j in range(best_start_idx, len(words)) if ends[j] - snapped_start <= max_duration]
            best_end_idx = valid[-1] if valid else len(words) - 1

    word_end = ends[best_end_idx]
    next_starts = [s for s in starts if s >= word_end]
    gap_after = max(0.0, min(next_starts) - word_end) if next_starts else max_tail
    tail = min(max_tail, gap_after / 2)
    snapped_end = min(float(video_duration), word_end + tail)

    # 3. ENFORCE DURATION CONSTRAINTS
    if snapped_end - snapped_start < min_duration:
        target = snapped_start + min_duration
        later = [e for e in ends if e >= target]
        if later and later[0] - snapped_start <= max_duration:
            next_s = [s for s in starts if s >= later[0]]
            gap = max(0.0, min(next_s) - later[0]) if next_s else max_tail
            snapped_end = min(float(video_duration), later[0] + min(max_tail, gap / 2))
        else:
            return original

    if snapped_end - snapped_start > max_duration:
        target = snapped_start + max_duration
        earlier = [e for e in ends if snapped_start < e <= target]
        if earlier:
            chosen_e = max(earlier)
            next_s = [s for s in starts if s >= chosen_e]
            gap = max(0.0, min(next_s) - chosen_e) if next_s else max_tail
            snapped_end = min(chosen_e + min(max_tail, gap / 2), snapped_start + max_duration, float(video_duration))
        else:
            snapped_end = min(snapped_start + max_duration, float(video_duration))

    if snapped_end <= snapped_start or snapped_end - snapped_start < min_duration:
        return original

    return (round(snapped_start, 3), round(snapped_end, 3))
