import React, { useState } from 'react';
import { Loader2, Gamepad2, Check, AlertCircle, Sparkles, User, Tv } from 'lucide-react';
import Modal from './ui/Modal';
import SegmentedControl from './ui/SegmentedControl';
import { apiFetch } from '../lib/api';
import { getApiUrl } from '../config';

const CAM_PRESETS = [
    { value: 'bottom_right', label: 'Inferior Der. ↘️', x: 0.85, y: 0.80, hint: 'Típico facecam streamer' },
    { value: 'bottom_left', label: 'Inferior Izq. ↙️', x: 0.15, y: 0.80, hint: 'Webcam izquierda' },
    { value: 'top_right', label: 'Superior Der. ↗️', x: 0.85, y: 0.20, hint: 'Webcam arriba derecha' },
    { value: 'top_left', label: 'Superior Izq. ↖️', x: 0.15, y: 0.20, hint: 'Webcam arriba izquierda' },
    { value: 'auto', label: 'Auto IA 🔍', x: null, y: null, hint: 'Detectar cara del streamer' },
];

const RATIO_OPTIONS = [
    { value: '0.35', label: '35% Cara / 65% Juego (Recomendado)' },
    { value: '0.40', label: '40% Cara / 60% Juego' },
];

export default function StreamerSplitModal({
    isOpen,
    onClose,
    jobId,
    clipIndex,
    videoUrl,
    inputFilename,
    onSplitApplied,
}) {
    const [camPreset, setCamPreset] = useState('bottom_right');
    const [topRatio, setTopRatio] = useState('0.35');
    const [gameX, setGameX] = useState(0.50);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const currentPreset = CAM_PRESETS.find((p) => p.value === camPreset) || CAM_PRESETS[0];
    const topPct = Math.round(parseFloat(topRatio) * 100);
    const botPct = 100 - topPct;

    const handleApply = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            const res = await apiFetch('/api/clip/streamer-split', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: clipIndex,
                    top_ratio: parseFloat(topRatio),
                    streamer_x: currentPreset.x,
                    streamer_y: currentPreset.y,
                    game_x: gameX,
                    game_y: 0.50,
                    input_filename: inputFilename,
                }),
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            if (onSplitApplied) {
                onSplitApplied(data);
            }
            onClose();
        } catch (err) {
            console.error('Streamer split error:', err);
            setError(err?.message || 'Error al aplicar el layout Streamer Split.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            eyebrow="FORMATO VIRAL GAMING"
            title="Streamer Split (35% Cara / 65% Juego) 🎮"
        >
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left: Visual Split Preview */}
                <div className="w-full max-w-[280px] mx-auto md:mx-0 md:w-[280px] shrink-0 self-start flex flex-col bg-black rounded-card border border-rule overflow-hidden relative aspect-[9/16]">
                    {/* Top 35% Box (Streamer) */}
                    <div
                        className="w-full bg-brass/15 border-b-2 border-brass flex flex-col items-center justify-center relative p-2"
                        style={{ height: `${topPct}%` }}
                    >
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-brass text-black font-bold text-xs uppercase tracking-tight shadow">
                            <User size={13} />
                            <span>Streamer ({topPct}%)</span>
                        </div>
                        <p className="text-[10px] text-brass mt-1 text-center font-medium">
                            {camPreset === 'auto' ? 'Auto IA detectará la cámara' : `Cámara en ${currentPreset.label}`}
                        </p>
                    </div>

                    {/* Bottom 65% Box (Gameplay) */}
                    <div
                        className="w-full bg-cyan-950/20 flex flex-col items-center justify-center relative p-2 flex-1"
                    >
                        {videoUrl ? (
                            <video
                                src={getApiUrl(videoUrl)}
                                className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
                                muted
                                playsInline
                                loop
                                autoPlay
                            />
                        ) : null}
                        <div className="z-10 flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500 text-black font-bold text-xs uppercase tracking-tight shadow">
                            <Gamepad2 size={14} />
                            <span>Juego ({botPct}%)</span>
                        </div>
                        <p className="z-10 text-[10px] text-cyan-200/80 mt-1 text-center font-medium">
                            Acción central del juego a pantalla completa
                        </p>
                    </div>

                    <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-brass font-medium">
                        9:16 Vertical Short
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="w-full md:w-80 flex flex-col space-y-4">
                    <p className="text-xs text-muted leading-relaxed">
                        Formato ideal para clips de Twitch, YouTube Gaming y TikTok.
                        Coloca exactamente un <strong>{topPct}% arriba para la reacción del streamer</strong> y un <strong>{botPct}% abajo para el juego</strong>,
                        evitando que la cara ocupe toda la pantalla.
                    </p>

                    {error && (
                        <div className="flex items-start gap-2 text-xs text-warn border border-warn/40 rounded-input p-2.5">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Ratio Selector */}
                    <div>
                        <p className="eyebrow mb-2">Proporción de Pantalla</p>
                        <SegmentedControl
                            options={RATIO_OPTIONS}
                            value={topRatio}
                            onChange={setTopRatio}
                            size="sm"
                        />
                    </div>

                    {/* Streamer Cam Presets */}
                    <div>
                        <p className="eyebrow mb-2">¿Dónde está la cámara en el stream?</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {CAM_PRESETS.map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setCamPreset(p.value)}
                                    className={`p-2 rounded-input border text-left transition-colors ${
                                        camPreset === p.value
                                            ? 'border-brass bg-brass/10 text-ink'
                                            : 'border-rule2 hover:border-brass/40 text-muted'
                                    }`}
                                >
                                    <div className="text-xs font-medium text-ink flex items-center justify-between">
                                        <span>{p.label}</span>
                                        {camPreset === p.value && <Check size={12} className="text-brass" />}
                                    </div>
                                    <span className="text-[10px] text-muted block mt-0.5 truncate">{p.hint}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Game center X slider */}
                    <div className="bg-paper3/40 p-3 rounded-input border border-rule/50 space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted">Centro de acción del juego:</span>
                            <span className="readout text-ink font-semibold">{Math.round(gameX * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0.25"
                            max="0.75"
                            step="0.05"
                            value={gameX}
                            onChange={(e) => setGameX(parseFloat(e.target.value))}
                            className="w-full accent-[var(--color-accent)]"
                        />
                        <div className="flex justify-between text-[10px] text-muted">
                            <span>Izquierda</span>
                            <button
                                type="button"
                                onClick={() => setGameX(0.50)}
                                className="text-brass hover:underline"
                            >
                                Centro (50%)
                            </button>
                            <span>Derecha</span>
                        </div>
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
                                    <span>Generando Split ({topPct}/{botPct})…</span>
                                </>
                            ) : (
                                <>
                                    <Gamepad2 size={16} />
                                    <span>Aplicar Streamer Split 🎮</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
