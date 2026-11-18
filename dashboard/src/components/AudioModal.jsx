import React, { useState } from 'react';
import { Volume2, Sparkles, Check, Loader2, ShieldCheck, Mic, Sliders, RotateCcw } from 'lucide-react';
import Modal from './ui/Modal';
import { apiFetch } from '../lib/api';

const AUDIO_PRESETS = [
    {
        id: 'anti_copyright',
        title: 'Anti-Copyright Dinámico (Recomendado)',
        desc: 'Acelera sutilmente el ritmo (+3%) manteniendo el tono 100% natural. Modifica la huella espectral para evadir Content ID y aumenta la retención.',
        icon: ShieldCheck,
        badge: 'Viral'
    },
    {
        id: 'podcast_pro',
        title: 'Podcast de Estudio (Shure SM7B)',
        desc: '100% natural a velocidad normal. Limpia graves retumbantes y da brillo y presencia nítida a la voz original sin alterar velocidad.',
        icon: Mic,
        badge: 'Estudio'
    },
    {
        id: 'natural_pitch',
        title: 'Voz con Más Cuerpo (Tono Cálido)',
        desc: 'Baja el tono sutilmente (-1.5%) a velocidad 100% normal. Suena más madura y masculina sin distorsión ni lentitud.',
        icon: Volume2,
        badge: 'Natural'
    },
    {
        id: 'clarity',
        title: 'Claridad & Máxima Dicción',
        desc: 'Corta ruidos sordos de fondo y realza frecuencias de voz para que cada palabra se entienda con total nitidez.',
        icon: Sparkles,
        badge: 'Nitidez'
    },
    {
        id: 'custom',
        title: 'Ajuste Manual Personalizado',
        desc: 'Controla el tono exacto (con compensación de velocidad a 1.0x), graves y normalización a tu gusto.',
        icon: Sliders
    }
];

export default function AudioModal({ isOpen, onClose, jobId, clipIndex, currentVideoUrl, onAudioProcessed }) {
    const [preset, setPreset] = useState('anti_copyright');
    const [pitch, setPitch] = useState(1.0);
    const [bassBoost, setBassBoost] = useState(false);
    const [clarity, setClarity] = useState(true);
    const [normalize, setNormalize] = useState(true);
    const [loading, setLoading] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [error, setError] = useState(null);

    const handleApply = async () => {
        setLoading(true);
        setError(null);
        try {
            const serverVideoFile = currentVideoUrl ? currentVideoUrl.split('/').pop() : null;
            const res = await apiFetch('/api/clip/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: clipIndex,
                    input_filename: serverVideoFile,
                    preset,
                    pitch: Number(pitch),
                    bass_boost: bassBoost,
                    clarity,
                    normalize,
                    revert: false
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Error al procesar el audio');
            }

            const data = await res.json();
            if (data.new_video_url && onAudioProcessed) {
                onAudioProcessed(data.new_video_url);
            }
            onClose();
        } catch (e) {
            setError(e?.message || 'Error al aplicar efecto de audio');
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreOriginal = async () => {
        setRestoring(true);
        setError(null);
        try {
            const serverVideoFile = currentVideoUrl ? currentVideoUrl.split('/').pop() : null;
            const res = await apiFetch('/api/clip/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: clipIndex,
                    input_filename: serverVideoFile,
                    preset: 'reset',
                    revert: true
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Error al restaurar audio original');
            }

            const data = await res.json();
            if (data.new_video_url && onAudioProcessed) {
                onAudioProcessed(data.new_video_url);
            }
            onClose();
        } catch (e) {
            setError(e?.message || 'Error al restaurar el audio');
        } finally {
            setRestoring(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            eyebrow="AUDIO STUDIO"
            title="Procesador de Voz y Frecuencias"
            footer={
                <div className="flex gap-2 w-full justify-between items-center">
                    <button
                        type="button"
                        onClick={handleRestoreOriginal}
                        disabled={loading || restoring}
                        className="btn-quiet py-2 px-3 text-xs flex items-center gap-1.5 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 transition-all rounded-button"
                        title="Elimina cualquier efecto de audio y vuelve al audio original del video"
                    >
                        {restoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        {restoring ? 'Restaurando…' : 'Restaurar audio original'}
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} disabled={loading || restoring} className="btn-quiet py-2 px-4 text-xs">
                            Cancelar
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={loading || restoring}
                            className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                            {loading ? 'Procesando audio…' : 'Aplicar al clip'}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-xs text-muted leading-relaxed">
                    Ajusta las frecuencias y el tono de la voz usando procesamiento local de alta fidelidad.
                    Conserva la velocidad y timbre natural para sonar profesional y <strong>evitar el Content ID</strong> de TikTok y YouTube.
                </p>

                {error && (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-input text-xs text-red-300">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    {AUDIO_PRESETS.map((p) => {
                        const Icon = p.icon;
                        const isSelected = preset === p.id;
                        return (
                            <div
                                key={p.id}
                                onClick={() => setPreset(p.id)}
                                className={`p-3 rounded-input border cursor-pointer transition-all flex items-start gap-3 ${
                                    isSelected
                                        ? 'border-brass bg-brass/10'
                                        : 'border-rule hover:border-rule2 bg-paper2/50'
                                }`}
                            >
                                <div className={`p-2 rounded-lg mt-0.5 ${isSelected ? 'bg-brass text-black' : 'bg-paper3 text-muted'}`}>
                                    <Icon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-semibold text-ink">{p.title}</h4>
                                        {p.badge && (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-brass/20 text-brass font-medium">
                                                {p.badge}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted mt-0.5 leading-snug">{p.desc}</p>
                                </div>
                                <div className="mt-1">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                        isSelected ? 'border-brass bg-brass text-black' : 'border-rule'
                                    }`}>
                                        {isSelected && <Check size={10} strokeWidth={3} />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {preset === 'custom' && (
                    <div className="p-3 rounded-input border border-rule bg-paper3/30 space-y-3 pt-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted">Tono / Pitch (Velocidad compensada):</span>
                                <span className="text-ink font-mono">{pitch}x {pitch < 1 ? '(Ligeramente más grave)' : pitch > 1 ? '(Ligeramente más agudo)' : '(Natural)'}</span>
                            </div>
                            <input
                                type="range"
                                min="0.94"
                                max="1.06"
                                step="0.005"
                                value={pitch}
                                onChange={(e) => setPitch(parseFloat(e.target.value))}
                                className="w-full accent-brass"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                            <label className="flex items-center gap-2 text-muted cursor-pointer hover:text-ink">
                                <input
                                    type="checkbox"
                                    checked={bassBoost}
                                    onChange={(e) => setBassBoost(e.target.checked)}
                                    className="rounded accent-brass"
                                />
                                Graves (Bass)
                            </label>
                            <label className="flex items-center gap-2 text-muted cursor-pointer hover:text-ink">
                                <input
                                    type="checkbox"
                                    checked={clarity}
                                    onChange={(e) => setClarity(e.target.checked)}
                                    className="rounded accent-brass"
                                />
                                Nitidez Vocal
                            </label>
                            <label className="flex items-center gap-2 text-muted cursor-pointer hover:text-ink">
                                <input
                                    type="checkbox"
                                    checked={normalize}
                                    onChange={(e) => setNormalize(e.target.checked)}
                                    className="rounded accent-brass"
                                />
                                Normalizar Vol.
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
                                    type="checkbox"
                                    checked={normalize}
                                    onChange={(e) => setNormalize(e.target.checked)}
                                    className="rounded accent-brass"
                                />
                                Normalizar Vol.
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
