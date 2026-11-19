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
            return {
                top: {
                    x: cur.top?.x ?? clamp(0.3),
                    y: cur.top?.y ?? 0.5,
                    zoom: cur.top?.zoom ?? 1.0,
                },
                bottom: {
                    x: cur.bottom?.x ?? clamp(0.7),
                    y: cur.bottom?.y ?? 0.5,
                    zoom: cur.bottom?.zoom ?? 1.0,
                },
                ratio: cur.ratio ?? 0.35,
            };
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

    const setSplitHalf = useCallback((idx, which, coords) => {
        setOverrides((o) => {
            const cur = o[idx];
            const base = (cur && typeof cur === 'object' && ('top' in cur))
                ? cur
                : {
                    top: { x: clamp(0.3), y: 0.5, zoom: 1.0 },
                    bottom: { x: clamp(0.7), y: 0.5, zoom: 1.0 },
                    ratio: 0.35,
                };
            const anterior = base[which] || { x: 0.5, y: 0.5, zoom: 1.0 };
            const nextHalf = { ...anterior };
            if (typeof coords === 'number') {
                nextHalf.x = clamp(coords);
            } else if (coords && typeof coords === 'object') {
                if (coords.x !== undefined) nextHalf.x = clamp(coords.x);
                if (coords.y !== undefined) nextHalf.y = Math.min(1.0, Math.max(0.0, coords.y));
                if (coords.zoom !== undefined) nextHalf.zoom = Math.min(2.5, Math.max(1.0, coords.zoom));
            }
            return {
                ...o,
                [idx]: {
                    ...base,
                    [which]: nextHalf,
                }
            };
        });
    }, [clamp]);

    const setSplitRatio = useCallback((idx, ratio) => {
        setOverrides((o) => {
            const cur = o[idx];
            const base = (cur && typeof cur === 'object' && ('top' in cur))
                ? cur
                : {
                    top: { x: clamp(0.3), y: 0.5, zoom: 1.0 },
                    bottom: { x: clamp(0.7), y: 0.5, zoom: 1.0 },
                    ratio: 0.35,
                };
            return {
                ...o,
                [idx]: {
                    ...base,
                    ratio: Math.min(0.65, Math.max(0.15, ratio)),
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
                    top: { x: clamp(centre - 0.2), y, zoom: 1.0 },
                    bottom: { x: clamp(centre + 0.2), y, zoom: 1.0 },
                    ratio: 0.35,
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
                    ? {
                        top: {
                            x: Number(v.top.x.toFixed(4)),
                            y: Number((v.top.y ?? 0.5).toFixed(4)),
                            zoom: Number((v.top.zoom ?? 1.0).toFixed(2)),
                        },
                        bottom: {
                            x: Number(v.bottom.x.toFixed(4)),
                            y: Number((v.bottom.y ?? 0.5).toFixed(4)),
                            zoom: Number((v.bottom.zoom ?? 1.0).toFixed(2)),
                        },
                        ratio: Number((v.ratio ?? 0.35).toFixed(2)),
                    }
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
                            onMoveHalf={(which, coords) => setSplitHalf(scene.index, which, coords)}
                            onSetSplitRatio={(r) => setSplitRatio(scene.index, r)}
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
                    onPlayToggle, onUpdateParams, onMoveHalf, onSetSplitRatio, onToggleSplit, onReset }) {
    const boxRef = useRef(null);
    const videoRef = useRef(null);
    const [dragging, setDragging] = useState(null);

    const isSplit = value && typeof value === 'object' && ('top' in value);
    const zoom = isSplit ? 1.0 : (value?.zoom ?? 1.0);
    const effect = isSplit ? 'none' : (value?.effect ?? 'none');
    const posX = isSplit ? 0.5 : (value?.x ?? 0.5);
    const posY = isSplit ? 0.5 : (value?.y ?? 0.5);

    const splitRatio = isSplit ? (value.ratio ?? 0.35) : 0.35;
    const topZoom = isSplit ? (value.top?.zoom ?? 1.0) : 1.0;
    const botZoom = isSplit ? (value.bottom?.zoom ?? 1.0) : 1.0;
    const topX = isSplit ? (value.top?.x ?? 0.3) : 0.5;
    const topY = isSplit ? (value.top?.y ?? 0.5) : 0.5;
    const botX = isSplit ? (value.bottom?.x ?? 0.7) : 0.5;
    const botY = isSplit ? (value.bottom?.y ?? 0.5) : 0.5;

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
            } else if (dragging === 'top' || dragging === 'bottom') {
                onMoveHalf(dragging, { x: coords.x, y: coords.y });
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

    // Single mode geometry
    const curWidthPct = (widthFraction / zoom) * 100;
    const curHeightPct = Math.min(100, (100 / zoom));
    const leftPct = (posX - (widthFraction / zoom) / 2) * 100;
    const topPct = (posY - (1 / zoom) / 2) * 100;

    // Split mode dynamic geometry based on splitRatio and individual zooms!
    const topAspect = 0.5625 / Math.max(0.15, Math.min(0.70, splitRatio));
    const botAspect = 0.5625 / Math.max(0.30, Math.min(0.85, 1.0 - splitRatio));

    // Top crop box (e.g. Creator / Minimap / Radar)
    const topH_pct = Math.min(100, Math.max(16, ((splitRatio / 0.50) * 55) / topZoom));
    const topW_pct = Math.min(100, Math.max(16, topH_pct * (topAspect / 1.777)));
    const topLeft_pct = Math.max(0, Math.min(100 - topW_pct, (topX - (topW_pct / 200)) * 100));
    const topTop_pct = Math.max(0, Math.min(100 - topH_pct, (topY - (topH_pct / 200)) * 100));

    // Bottom crop box (e.g. Gameplay action)
    const botH_pct = Math.min(100, Math.max(25, (((1.0 - splitRatio) / 0.50) * 75) / botZoom));
    const botW_pct = Math.min(100, Math.max(20, botH_pct * (botAspect / 1.777)));
    const botLeft_pct = Math.max(0, Math.min(100 - botW_pct, (botX - (botW_pct / 200)) * 100));
    const botTop_pct = Math.max(0, Math.min(100 - botH_pct, (botY - (botH_pct / 200)) * 100));

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
                        title="Dividir en 2 regiones apiladas"
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

                {/* Shading outside the crop window in Single mode */}
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
                    // Split mode with 2D Dragging & Dynamic Proportions
                    <>
                        {/* Top Box: Creator / Minimap */}
                        <div
                            onMouseDown={startDrag('top')}
                            onTouchStart={startDrag('top')}
                            className="absolute border-2 border-brass bg-brass/10 cursor-move flex flex-col justify-between p-1"
                            style={{
                                left: `${topLeft_pct}%`,
                                top: `${topTop_pct}%`,
                                width: `${topW_pct}%`,
                                height: `${topH_pct}%`,
                            }}
                        >
                            <div className="flex items-center gap-1 self-start pointer-events-none">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-brass text-black font-bold uppercase leading-none">
                                    ARRIBA ({Math.round(splitRatio * 100)}%)
                                </span>
                                {topZoom > 1 && (
                                    <span className="text-[9px] px-1 rounded bg-black/70 text-brass font-mono">
                                        {topZoom}x
                                    </span>
                                )}
                            </div>
                            <span className="text-[8px] text-brass opacity-70 self-center">Arrastrar</span>
                        </div>

                        {/* Bottom Box: Gameplay */}
                        <div
                            onMouseDown={startDrag('bottom')}
                            onTouchStart={startDrag('bottom')}
                            className="absolute border-2 border-dashed border-cyan-400 bg-cyan-500/10 cursor-move flex flex-col justify-between p-1"
                            style={{
                                left: `${botLeft_pct}%`,
                                top: `${botTop_pct}%`,
                                width: `${botW_pct}%`,
                                height: `${botH_pct}%`,
                            }}
                        >
                            <div className="flex items-center gap-1 self-start pointer-events-none">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400 text-black font-bold uppercase leading-none">
                                    ABAJO ({Math.round((1 - splitRatio) * 100)}%)
                                </span>
                                {botZoom > 1 && (
                                    <span className="text-[9px] px-1 rounded bg-black/70 text-cyan-300 font-mono">
                                        {botZoom}x
                                    </span>
                                )}
                            </div>
                            <span className="text-[8px] text-cyan-300 opacity-70 self-center">Arrastrar</span>
                        </div>
                    </>
                )}
            </div>

            {/* Single Mode Controls */}
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

            {/* Split Mode Controls: Proporción + Zoom Arriba + Zoom Abajo */}
            {isSplit && (
                <div className="space-y-3 pt-1 text-xs">
                    {/* Proporción / Tamaño de cada parte */}
                    <div className="p-2.5 rounded-input bg-paper3/40 border border-rule/50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted font-medium flex items-center gap-1.5">
                                <Columns2 size={13} className="text-brass" /> División de pantalla:
                            </span>
                            <span className="readout text-ink font-semibold">
                                Arriba: <strong className="text-brass">{Math.round(splitRatio * 100)}%</strong> · Abajo: <strong className="text-cyan-400">{Math.round((1 - splitRatio) * 100)}%</strong>
                            </span>
                        </div>

                        {/* Presets rápidos */}
                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                type="button"
                                onClick={() => onSetSplitRatio(0.25)}
                                className={`py-1.5 px-2 rounded border text-[11px] transition-colors ${
                                    Math.round(splitRatio * 100) === 25
                                        ? 'border-brass bg-brass/10 text-brass font-bold'
                                        : 'border-rule text-muted hover:text-ink'
                                }`}
                            >
                                25% / 75% 🗺️ (Minimapa)
                            </button>
                            <button
                                type="button"
                                onClick={() => onSetSplitRatio(0.35)}
                                className={`py-1.5 px-2 rounded border text-[11px] transition-colors ${
                                    Math.round(splitRatio * 100) === 35
                                        ? 'border-brass bg-brass/10 text-brass font-bold'
                                        : 'border-rule text-muted hover:text-ink'
                                }`}
                            >
                                35% / 65% 🎮 (Streamer)
                            </button>
                            <button
                                type="button"
                                onClick={() => onSetSplitRatio(0.50)}
                                className={`py-1.5 px-2 rounded border text-[11px] transition-colors ${
                                    Math.round(splitRatio * 100) === 50
                                        ? 'border-brass bg-brass/10 text-brass font-bold'
                                        : 'border-rule text-muted hover:text-ink'
                                }`}
                            >
                                50% / 50% 🎙️ (Mitad)
                            </button>
                        </div>

                        {/* Slider libre de proporción */}
                        <div className="space-y-1">
                            <input
                                type="range"
                                min="0.15"
                                max="0.60"
                                step="0.01"
                                value={splitRatio}
                                onChange={(e) => onSetSplitRatio(parseFloat(e.target.value))}
                                className="w-full accent-brass"
                            />
                            <div className="flex justify-between text-[10px] text-muted">
                                <span>15% (Pequeño / Banner)</span>
                                <span>35% (Streamer estándar)</span>
                                <span>60% (Grande)</span>
                            </div>
                        </div>
                    </div>

                    {/* Sliders de Zoom independientes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Zoom Arriba */}
                        <div className="flex items-center gap-2 bg-paper3/40 p-2 rounded-input border border-brass/40">
                            <ZoomIn size={14} className="text-brass shrink-0" />
                            <span className="text-muted text-[11px] shrink-0">Zoom Arriba:</span>
                            <input
                                type="range"
                                min="1.0"
                                max="2.5"
                                step="0.05"
                                value={topZoom}
                                onChange={(e) => onMoveHalf('top', { zoom: parseFloat(e.target.value) })}
                                className="w-full accent-brass"
                            />
                            <span className="text-ink font-mono text-[11px] w-9 text-right">{topZoom}x</span>
                        </div>

                        {/* Zoom Abajo */}
                        <div className="flex items-center gap-2 bg-paper3/40 p-2 rounded-input border border-cyan-500/40">
                            <ZoomIn size={14} className="text-cyan-400 shrink-0" />
                            <span className="text-muted text-[11px] shrink-0">Zoom Abajo:</span>
                            <input
                                type="range"
                                min="1.0"
                                max="2.5"
                                step="0.05"
                                value={botZoom}
                                onChange={(e) => onMoveHalf('bottom', { zoom: parseFloat(e.target.value) })}
                                className="w-full accent-cyan-400"
                            />
                            <span className="text-ink font-mono text-[11px] w-9 text-right">{botZoom}x</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
