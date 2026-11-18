import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Loader2, Crosshair, RotateCcw, AlertCircle, Play, Pause, Columns2, ZoomIn, Sparkles } from 'lucide-react';
import { getApiUrl } from '../config';
import { apiJson } from '../lib/api';

const fmt = (s) => {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
};

export default function ReframeEditor({ jobId, clipIndex, clipTitle, onClose, onReframed }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [overrides, setOverrides] = useState({});
    const [playing, setPlaying] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await apiJson(`/api/clip/${jobId}/${clipIndex}/scenes`);
                if (!alive) return;
                setData(res);
                const salvos = res.saved_overrides || {};
                setOverrides(Object.fromEntries(
                    Object.entries(salvos).map(([k, v]) => [Number(k), v])
                ));
            } catch (e) {
                if (alive) setError(e?.message || 'Could not read the scenes of this clip.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [jobId, clipIndex]);

    const half = (data?.crop_width_fraction ?? 0.5) / 2;
    const clamp = useCallback((v) => Math.min(1 - half, Math.max(half, v)), [half]);

    const valueOf = useCallback((scene) => {
        const cur = overrides[scene.index];
        if (cur !== undefined) {
            if (typeof cur === 'number') {
                return { x: cur, y: 0.5, zoom: 1.0, effect: 'none' };
            }
            if (cur && typeof cur === 'object' && !('top' in cur)) {
                return {
                    x: cur.x ?? clamp(scene.suggested_center),
                    y: cur.y ?? 0.5,
                    zoom: cur.zoom ?? 1.0,
                    effect: cur.effect ?? 'none',
                };
            }
            return cur; // split object {top, bottom}
        }
        return {
            x: clamp(scene.suggested_center),
            y: scene.suggested_center_y ?? 0.5,
            zoom: 1.0,
            effect: 'none',
        };
    }, [overrides, clamp]);

    const setSingleParams = useCallback((idx, params) => {
        setOverrides((o) => {
            const cur = o[idx];
            let base;
            if (typeof cur === 'number') {
                base = { x: cur, y: 0.5, zoom: 1.0, effect: 'none' };
            } else if (cur && typeof cur === 'object' && !('top' in cur)) {
                base = { ...cur };
            } else {
                base = { x: 0.5, y: 0.5, zoom: 1.0, effect: 'none' };
            }
            const next = { ...base, ...params };
            if (params.x !== undefined) next.x = clamp(params.x);
            if (params.y !== undefined) next.y = Math.min(1.0, Math.max(0.0, params.y));
            if (params.zoom !== undefined) next.zoom = Math.min(2.2, Math.max(1.0, params.zoom));
            return { ...o, [idx]: next };
        });
    }, [clamp]);

    const setSplitHalf = useCallback((idx, which, fraction) => {
        setOverrides((o) => {
            const cur = o[idx];
            const base = (cur && typeof cur === 'object' && ('top' in cur))
                ? cur
                : { top: { x: clamp(0.3), y: 0.5 }, bottom: { x: clamp(0.7), y: 0.5 } };
            const anterior = base[which] || { y: 0.5 };
            return {
                ...o,
                [idx]: {
                    ...base,
                    [which]: { x: clamp(fraction), y: anterior.y ?? 0.5 },
                }
            };
        });
    }, [clamp]);

    const toggleSplit = useCallback((idx, scene) => {
        setOverrides((o) => {
            const cur = o[idx];
            if (cur && typeof cur === 'object' && ('top' in cur)) {
                return { ...o, [idx]: { x: cur.top?.x ?? 0.5, y: 0.5, zoom: 1.0, effect: 'none' } };
            }
            const centre = (typeof cur === 'object' && 'x' in cur)
                ? cur.x
                : (typeof cur === 'number' ? cur : clamp(scene.suggested_center));
            const y = scene.suggested_center_y ?? 0.5;
            return {
                ...o,
                [idx]: {
                    top: { x: clamp(centre - 0.2), y },
                    bottom: { x: clamp(centre + 0.2), y },
                }
            };
        });
    }, [clamp]);

    const resetScene = useCallback((idx) => {
        setOverrides((o) => {
            const next = { ...o };
            delete next[idx];
            return next;
        });
    }, []);

    const adjusted = Object.keys(overrides).length;

    const handleSave = async () => {
        if (!adjusted || saving) return;
        setSaving(true);
        setError(null);
        try {
            const payload = Object.fromEntries(Object.entries(overrides).map(([k, v]) => [
                String(k),
                (typeof v === 'object' && 'top' in v)
                    ? { top: { x: Number(v.top.x.toFixed(4)), y: Number(v.top.y.toFixed(4)) },
                        bottom: { x: Number(v.bottom.x.toFixed(4)), y: Number(v.bottom.y.toFixed(4)) } }
                    : (typeof v === 'object' && 'x' in v)
                        ? {
                            x: Number(v.x.toFixed(4)),
                            y: Number((v.y ?? 0.5).toFixed(4)),
                            zoom: Number((v.zoom ?? 1.0).toFixed(2)),
                            effect: v.effect || 'none'
                        }
                        : Number(v.toFixed(4)),
            ]));
            const res = await apiJson('/api/clip/reframe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_id: jobId, clip_index: clipIndex, crop_overrides: payload }),
            });
            if (onReframed) onReframed(clipIndex, res);
            onClose();
        } catch (e) {
            setError(e?.message || 'The re-render failed.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="card w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-b-none sm:rounded-card animate-sheet-up sm:animate-none">
                <div className="flex items-center justify-between p-4 border-b border-rule">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Crosshair size={18} className="text-brass shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-base font-medium text-ink lowercase truncate">Reframe Pro Ultra</h2>
                            {clipTitle && <p className="text-xs text-muted truncate">{clipTitle}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-paper3 rounded-input transition-colors">
                        <X size={18} className="text-muted" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-4 space-y-6">
                    <p className="text-xs text-muted leading-relaxed">
                        Control 100% escena por escena: arrastra el recuadro para centrar la cara,
                        ajusta el <strong>Zoom</strong> para plano medio o primer plano, o añade efectos visuales.
                    </p>

                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-muted py-8 justify-center">
                            <Loader2 size={18} className="animate-spin text-brass" />
                            Cargando escenas del clip…
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 text-xs text-warn border border-warn/40 rounded-input p-3">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {data?.scenes?.map((scene) => (
                        <SceneRow
                            key={scene.index}
                            scene={scene}
                            value={valueOf(scene)}
                            widthFraction={data.crop_width_fraction}
                            previewUrl={data.preview_url}
                            touched={scene.index in overrides}
                            playing={playing === scene.index}
                            onPlayToggle={() => setPlaying((p) => (p === scene.index ? null : scene.index))}
                            onUpdateParams={(p) => setSingleParams(scene.index, p)}
                            onMoveHalf={(which, f) => setSplitHalf(scene.index, which, f)}
                            onToggleSplit={() => toggleSplit(scene.index, scene)}
                            onReset={() => resetScene(scene.index)}
                        />
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-t border-rule">
                    <span className="text-xs text-muted">
                        {adjusted === 0
                            ? 'Ningún ajuste manual todavía'
                            : `${adjusted} escena${adjusted > 1 ? 's' : ''} reencuadrada(s) a medida`}
                    </span>
                    <div className="flex items-center gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
                        <button onClick={onClose} className="btn-quiet py-2 px-4 text-sm">Cancelar</button>
                        <button
                            onClick={handleSave}
                            disabled={!adjusted || saving}
                            className="btn-primary py-2 px-4 text-sm disabled:opacity-40 flex items-center gap-2"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                            {saving ? 'Re-renderizando…' : 'Aplicar Reframe Pro'}
                        </button>
                    </div>
                </div>
                <div className="sm:hidden safe-bottom" />
            </div>
        </div>
    );
}

function SceneRow({ scene, value, widthFraction, previewUrl, touched, playing,
                    onPlayToggle, onUpdateParams, onMoveHalf, onToggleSplit, onReset }) {
    const boxRef = useRef(null);
    const videoRef = useRef(null);
    const [dragging, setDragging] = useState(null);

    const isSplit = value && typeof value === 'object' && ('top' in value);
    const zoom = isSplit ? 1.0 : (value?.zoom ?? 1.0);
    const effect = isSplit ? 'none' : (value?.effect ?? 'none');
    const posX = isSplit ? 0.5 : (value?.x ?? 0.5);
    const posY = isSplit ? 0.5 : (value?.y ?? 0.5);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (!playing) { v.pause(); return; }
        v.currentTime = scene.start;
        v.play().catch(() => {});
        const stopAtEnd = () => { if (v.currentTime >= scene.end) { v.pause(); } };
        v.addEventListener('timeupdate', stopAtEnd);
        return () => v.removeEventListener('timeupdate', stopAtEnd);
    }, [playing, scene.start, scene.end]);

    const coordsFromEvent = useCallback((clientX, clientY) => {
        const el = boxRef.current;
        if (!el) return { x: 0.5, y: 0.5 };
        const rect = el.getBoundingClientRect();
        return {
            x: (clientX - rect.left) / rect.width,
            y: (clientY - rect.top) / rect.height,
        };
    }, []);

    useEffect(() => {
        if (!dragging) return;
        const move = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const coords = coordsFromEvent(clientX, clientY);
            if (dragging === 'single') {
                onUpdateParams({ x: coords.x, y: coords.y });
            } else {
                onMoveHalf(dragging, coords.x);
            }
        };
        const up = () => setDragging(null);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchmove', move);
        window.addEventListener('touchend', up);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', up);
        };
    }, [dragging, coordsFromEvent, onUpdateParams, onMoveHalf]);

    const startDrag = (which) => (e) => {
        e.stopPropagation();
        setDragging(which);
    };

    const curWidthPct = (widthFraction / zoom) * 100;
    const curHeightPct = Math.min(100, (100 / zoom));
    const leftPct = (posX - (widthFraction / zoom) / 2) * 100;
    const topPct = (posY - (1 / zoom) / 2) * 100;

    return (
        <div className="p-3.5 rounded-input border border-rule bg-paper2/40 space-y-3">
            <div className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        onClick={onPlayToggle}
                        className="flex items-center gap-1.5 text-ink hover:text-brass transition-colors p-1 rounded bg-paper3"
                        title="Reproducir esta escena con audio"
                    >
                        {playing ? <Pause size={13} /> : <Play size={13} />}
                        <span className="font-medium text-[11px]">Play</span>
                    </button>
                    <span className="readout text-ink font-semibold truncate">
                        Escena {scene.index + 1}
                    </span>
                    <span className="text-[11px] text-muted">
                        ({fmt(scene.start)} – {fmt(scene.end)})
                    </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={onToggleSplit}
                        className={`flex items-center gap-1 transition-colors px-2 py-0.5 rounded border ${
                            isSplit ? 'border-brass bg-brass/10 text-brass' : 'border-rule text-muted hover:text-ink2'}`}
                        title="Dividir en 2 personas apiladas"
                    >
                        <Columns2 size={12} /> Split
                    </button>
                    {touched ? (
                        <button onClick={onReset} className="flex items-center gap-1 text-brass hover:underline text-[11px]">
                            <RotateCcw size={12} /> Auto
                        </button>
                    ) : (
                        <span className="text-muted text-[11px]">Auto IA</span>
                    )}
                </div>
            </div>

            {/* Video Box Canvas */}
            <div
                ref={boxRef}
                className={`relative overflow-hidden rounded-input select-none border aspect-video ${
                    touched ? 'border-brass ring-1 ring-brass/40' : 'border-rule'}`}
            >
                {playing && previewUrl ? (
                    <video
                        ref={videoRef}
                        src={getApiUrl(previewUrl)}
                        playsInline
                        className="w-full h-full object-cover block"
                    />
                ) : scene.thumbnail_url ? (
                    <img
                        src={getApiUrl(scene.thumbnail_url)}
                        alt=""
                        draggable={false}
                        className="w-full h-full object-cover block pointer-events-none"
                    />
                ) : (
                    <div className="w-full h-full bg-paper3" />
                )}

                {/* Shading outside the crop window */}
                {!isSplit && (
                    <>
                        <div className="absolute inset-y-0 left-0 bg-black/65 pointer-events-none"
                             style={{ width: `${Math.max(0, leftPct)}%` }} />
                        <div className="absolute inset-y-0 right-0 bg-black/65 pointer-events-none"
                             style={{ width: `${Math.max(0, 100 - (leftPct + curWidthPct))}%` }} />
                    </>
                )}

                {/* Bounding box for Single Mode */}
                {!isSplit ? (
                    <div
                        onMouseDown={startDrag('single')}
                        onTouchStart={startDrag('single')}
                        className="absolute border-2 border-brass cursor-move flex flex-col justify-between p-1 bg-brass/5"
                        style={{
                            left: `${Math.max(0, Math.min(100 - curWidthPct, leftPct))}%`,
                            top: `${Math.max(0, Math.min(100 - curHeightPct, topPct))}%`,
                            width: `${curWidthPct}%`,
                            height: `${curHeightPct}%`,
                        }}
                    >
                        <span className="text-[9px] px-1 rounded bg-brass text-black font-bold uppercase self-start leading-none py-0.5">
                            {zoom > 1 ? `${zoom}x` : '9:16'}
                        </span>
                        <div className="text-[9px] text-brass self-center opacity-70">
                            Mover
                        </div>
                    </div>
                ) : (
                    // Split mode
                    <>
                        <div
                            onMouseDown={startDrag('top')}
                            onTouchStart={startDrag('top')}
                            className="absolute inset-y-0 border-2 border-brass cursor-ew-resize"
                            style={{
                                left: `${(value.top.x - widthFraction / 2) * 100}%`,
                                width: `${widthFraction * 100}%`
                            }}
                        >
                            <span className="absolute top-1 left-1 text-[9px] px-1 rounded bg-brass text-black font-bold">
                                ARRIBA
                            </span>
                        </div>
                        <div
                            onMouseDown={startDrag('bottom')}
                            onTouchStart={startDrag('bottom')}
                            className="absolute inset-y-0 border-2 border-dashed border-cyan-400 cursor-ew-resize"
                            style={{
                                left: `${(value.bottom.x - widthFraction / 2) * 100}%`,
                                width: `${widthFraction * 100}%`
                            }}
                        >
                            <span className="absolute top-1 left-1 text-[9px] px-1 rounded bg-cyan-400 text-black font-bold">
                                ABAJO
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Controls Bar for this scene */}
            {!isSplit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    {/* Zoom / Scale Slider */}
                    <div className="flex items-center gap-2 bg-paper3/40 p-2 rounded-input border border-rule/50">
                        <ZoomIn size={14} className="text-brass shrink-0" />
                        <span className="text-muted text-[11px] shrink-0">Zoom:</span>
                        <input
                            type="range"
                            min="1.0"
                            max="2.0"
                            step="0.05"
                            value={zoom}
                            onChange={(e) => onUpdateParams({ zoom: parseFloat(e.target.value) })}
                            className="w-full accent-brass"
                        />
                        <span className="text-ink font-mono text-[11px] w-9 text-right">{zoom}x</span>
                    </div>

                    {/* Scene Visual Effect */}
                    <div className="flex items-center gap-2 bg-paper3/40 p-2 rounded-input border border-rule/50">
                        <Sparkles size={14} className="text-brass shrink-0" />
                        <span className="text-muted text-[11px] shrink-0">Efecto:</span>
                        <select
                            value={effect}
                            onChange={(e) => onUpdateParams({ effect: e.target.value })}
                            className="bg-paper border border-rule rounded px-2 py-0.5 text-[11px] text-ink w-full focus:outline-none focus:border-brass"
                        >
                            <option value="none">Normal (Estático)</option>
                            <option value="slow_zoom">Slow Zoom In (Suave)</option>
                            <option value="punch_in">Punch-In (Impacto)</option>
                            <option value="blur_bg">Fondo Desenfoque</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
