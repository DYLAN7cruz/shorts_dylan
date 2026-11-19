import React, { useState } from 'react';
import { Loader2, EyeOff, Check, AlertCircle, Shield } from 'lucide-react';
import Modal from './ui/Modal';
import SegmentedControl from './ui/SegmentedControl';
import { apiFetch } from '../lib/api';
import { getApiUrl } from '../config';

const CORNER_PRESETS = [
    { value: 'bottom_right', label: 'Inferior Der. ↘️', hint: 'Típico facecam streamer' },
    { value: 'bottom_left', label: 'Inferior Izq. ↙️', hint: 'Webcam izquierda' },
    { value: 'top_right', label: 'Superior Der. ↗️', hint: 'Webcam arriba derecha' },
    { value: 'top_left', label: 'Superior Izq. ↖️', hint: 'Webcam arriba izquierda' },
    { value: 'custom', label: 'Manual 🎯', hint: 'Ajuste libre' },
];

const STYLE_OPTIONS = [
    { value: 'blur', label: 'Desenfoque (Blur)' },
    { value: 'black', label: 'Caja Negra' },
    { value: 'pixelate', label: 'Pixelado' },
];

export default function FacecamMaskModal({
    isOpen,
    onClose,
    jobId,
    clipIndex,
    videoUrl,
    inputFilename,
    onMaskApplied,
}) {
    const [corner, setCorner] = useState('bottom_right');
    const [style, setStyle] = useState('blur');
    const [widthPct, setWidthPct] = useState(0.28);
    const [heightPct, setHeightPct] = useState(0.24);
    const [customX, setCustomX] = useState(0.70);
    const [customY, setCustomY] = useState(0.72);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    // Calculate preview box coordinates in %
    let boxLeft = 70;
    let boxTop = 72;
    const boxW = Math.round(widthPct * 100);
    const boxH = Math.round(heightPct * 100);

    if (corner === 'bottom_right') {
        boxLeft = 100 - boxW - 2;
        boxTop = 100 - boxH - 2;
    } else if (corner === 'bottom_left') {
        boxLeft = 2;
        boxTop = 100 - boxH - 2;
    } else if (corner === 'top_right') {
        boxLeft = 100 - boxW - 2;
        boxTop = 2;
    } else if (corner === 'top_left') {
        boxLeft = 2;
        boxTop = 2;
    } else {
        boxLeft = Math.round(customX * 100);
        boxTop = Math.round(customY * 100);
    }

    const handleApply = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            const res = await apiFetch('/api/clip/mask-facecam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: clipIndex,
                    corner,
                    style,
                    width_pct: widthPct,
                    height_pct: heightPct,
                    x_pct: corner === 'custom' ? customX : undefined,
                    y_pct: corner === 'custom' ? customY : undefined,
                    input_filename: inputFilename,
                }),
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            if (onMaskApplied) {
                onMaskApplied(data);
            }
            onClose();
        } catch (err) {
            console.error('Facecam mask error:', err);
            setError(err?.message || 'Error al aplicar la máscara sobre la facecam.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            eyebrow="PRIVACIDAD Y STREAMING"
            title="Ocultar Facecam / Tapar Rostro 🎭"
        >
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left: Video Preview with dynamic mask box */}
                <div className="w-full max-w-[280px] mx-auto md:mx-0 md:w-[280px] shrink-0 self-start flex flex-col items-center justify-center bg-black rounded-card border border-rule overflow-hidden relative aspect-[9/16]">
                    {videoUrl ? (
                        <video
                            src={getApiUrl(videoUrl)}
                            className="w-full h-full object-contain block"
                            muted
                            playsInline
                            loop
                            autoPlay
                        />
                    ) : (
                        <div className="w-full h-full bg-paper3" />
                    )}

                    {/* Mask Box Preview */}
                    <div
                        className={`absolute rounded transition-all duration-150 flex flex-col items-center justify-center border-2 border-brass/80 pointer-events-none ${
                            style === 'black'
                                ? 'bg-black'
                                : style === 'pixelate'
                                ? 'bg-emerald-950/80 backdrop-blur-md'
                                : 'bg-white/10 backdrop-blur-lg ring-1 ring-white/30'
                        }`}
                        style={{
                            left: `${Math.max(0, Math.min(100 - boxW, boxLeft))}%`,
                            top: `${Math.max(0, Math.min(100 - boxH, boxTop))}%`,
                            width: `${boxW}%`,
                            height: `${boxH}%`,
                        }}
                    >
                        <EyeOff size={16} className="text-brass shrink-0" />
                        <span className="text-[9px] font-bold text-white uppercase mt-0.5 tracking-tight px-1 rounded bg-black/60">
                            Facecam
                        </span>
                    </div>

                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-brass font-medium">
                        Vista previa de máscara
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="w-full md:w-80 flex flex-col space-y-4">
                    <p className="text-xs text-muted leading-relaxed">
                        Cubre o desenfoca la cámara del streamer en la esquina que elijas.
                        <strong> Conserva el 100% de la voz original</strong> y todo el audio del juego sin perder calidad.
                    </p>

                    {error && (
                        <div className="flex items-start gap-2 text-xs text-warn border border-warn/40 rounded-input p-2.5">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Corner Presets */}
                    <div>
                        <p className="eyebrow mb-2">Esquina de la Facecam</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {CORNER_PRESETS.map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setCorner(p.value)}
                                    className={`p-2 rounded-input border text-left transition-colors ${
                                        corner === p.value
                                            ? 'border-brass bg-brass/10 text-ink'
                                            : 'border-rule2 hover:border-brass/40 text-muted'
                                    }`}
                                >
                                    <div className="text-xs font-medium text-ink flex items-center justify-between">
                                        <span>{p.label}</span>
                                        {corner === p.value && <Check size={12} className="text-brass" />}
                                    </div>
                                    <span className="text-[10px] text-muted block mt-0.5 truncate">{p.hint}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Style selector */}
                    <div>
                        <p className="eyebrow mb-2">Estilo de Ocultación</p>
                        <SegmentedControl
                            options={STYLE_OPTIONS}
                            value={style}
                            onChange={setStyle}
                            size="sm"
                        />
                    </div>

                    {/* Size Sliders */}
                    <div className="space-y-3 bg-paper3/40 p-3 rounded-input border border-rule/50">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted">Ancho de la máscara:</span>
                                <span className="readout text-ink font-semibold">{boxW}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.10"
                                max="0.55"
                                step="0.01"
                                value={widthPct}
                                onChange={(e) => setWidthPct(parseFloat(e.target.value))}
                                className="w-full accent-[var(--color-accent)]"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted">Alto de la máscara:</span>
                                <span className="readout text-ink font-semibold">{boxH}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.10"
                                max="0.45"
                                step="0.01"
                                value={heightPct}
                                onChange={(e) => setHeightPct(parseFloat(e.target.value))}
                                className="w-full accent-[var(--color-accent)]"
                            />
                        </div>

                        {corner === 'custom' && (
                            <>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-muted">Posición Horizontal (X):</span>
                                        <span className="readout text-ink font-semibold">{Math.round(customX * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.0"
                                        max="0.8"
                                        step="0.01"
                                        value={customX}
                                        onChange={(e) => setCustomX(parseFloat(e.target.value))}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-muted">Posición Vertical (Y):</span>
                                        <span className="readout text-ink font-semibold">{Math.round(customY * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.0"
                                        max="0.8"
                                        step="0.01"
                                        value={customY}
                                        onChange={(e) => setCustomY(parseFloat(e.target.value))}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2 mt-4 pt-2 border-t border-rule">
                        <button type="button" onClick={onClose} className="btn-ghost">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            disabled={isProcessing}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin text-brassink" />
                                    <span>Aplicando máscara…</span>
                                </>
                            ) : (
                                <>
                                    <Shield size={16} />
                                    <span>Ocultar Facecam 🎭</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
