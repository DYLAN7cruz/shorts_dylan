import React, { useState, useEffect } from 'react';
import { Bot, Volume2, Play, Check, Loader2, RotateCcw, Sliders, Radio, Sparkles } from 'lucide-react';
import Modal from './ui/Modal';
import { apiFetch } from '../lib/api';

const DEFAULT_VOICES = [
    { id: 'es-MX-JorgeNeural', name: 'Jorge (México)', desc: 'Masculina enérgica y viral (estándar de TikTok / Reels)', flag: '🇲🇽', badge: 'Viral TikTok' },
    { id: 'es-ES-AlvaroNeural', name: 'Álvaro (España)', desc: 'Masculina seria y profunda (documentales, podcasts y misterio)', flag: '🇪🇸', badge: 'Popular' },
    { id: 'es-MX-DaliaNeural', name: 'Dalia (México)', desc: 'Femenina dinámica, alegre y expresiva', flag: '🇲🇽' },
    { id: 'es-ES-ElviraNeural', name: 'Elvira (España)', desc: 'Femenina elegante, cálida y profesional', flag: '🇪🇸' },
    { id: 'es-AR-TomasNeural', name: 'Tomás (Argentina)', desc: 'Masculina moderna, fluida y cercana', flag: '🇦🇷' },
    { id: 'es-US-AlonsoNeural', name: 'Alonso (Latam)', desc: 'Masculina joven de creador de contenido tech', flag: '🌎' }
];

export default function VoiceoverModal({ isOpen, onClose, jobId, clipIndex, currentVideoUrl, onVoiceoverApplied }) {
    const [text, setText] = useState('');
    const [selectedVoice, setSelectedVoice] = useState('es-MX-JorgeNeural');
    const [voices, setVoices] = useState(DEFAULT_VOICES);
    const [speed, setSpeed] = useState(1.05);
    const [mode, setMode] = useState('ducking'); // 'ducking' or 'replace'
    const [loadingTranscript, setLoadingTranscript] = useState(false);
    const [applying, setApplying] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !jobId || clipIndex == null) return;
        let isMounted = true;
        setLoadingTranscript(true);
        setError(null);

        apiFetch(`/api/clip/${jobId}/${clipIndex}/transcript`)
            .then(res => res.json())
            .then(data => {
                if (!isMounted) return;
                let fullText = data.text || '';
                if (!fullText && Array.isArray(data.captions)) {
                    fullText = data.captions.map(c => c.text).join(' ');
                }
                if (fullText) setText(fullText);
                if (data.voices && data.voices.length > 0) setVoices(data.voices);
            })
            .catch(err => {
                if (isMounted) setError('No se pudo cargar la transcripción del clip');
            })
            .finally(() => {
                if (isMounted) setLoadingTranscript(false);
            });

        return () => { isMounted = false; };
    }, [isOpen, jobId, clipIndex]);

    const handleApply = async () => {
        if (!text.trim()) {
            setError('El texto de la narración no puede estar vacío');
            return;
        }
        setApplying(true);
        setError(null);
        try {
            const serverVideoFile = currentVideoUrl ? currentVideoUrl.split('/').pop() : null;
            const res = await apiFetch('/api/clip/voiceover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: clipIndex,
                    input_filename: serverVideoFile,
                    text: text.trim(),
                    voice: selectedVoice,
                    speed: Number(speed),
                    mode
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Error al generar la voz con IA');
            }

            const data = await res.json();
            if (data.new_video_url && onVoiceoverApplied) {
                onVoiceoverApplied(data.new_video_url);
            }
            onClose();
        } catch (e) {
            setError(e?.message || 'Error al aplicar el locutor IA');
        } finally {
            setApplying(false);
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
            if (data.new_video_url && onVoiceoverApplied) {
                onVoiceoverApplied(data.new_video_url);
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
            eyebrow="VOZ NEURONAL IA · GRATIS"
            title="Locutor IA Estilo ElevenLabs"
            footer={
                <div className="flex gap-2 w-full justify-between items-center">
                    <button
                        type="button"
                        onClick={handleRestoreOriginal}
                        disabled={applying || restoring || loadingTranscript}
                        className="btn-quiet py-2 px-3 text-xs flex items-center gap-1.5 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 transition-all rounded-button"
                        title="Restaura la pista de audio original del video"
                    >
                        {restoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        {restoring ? 'Restaurando…' : 'Restaurar audio original'}
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} disabled={applying || restoring} className="btn-quiet py-2 px-4 text-xs">
                            Cancelar
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={applying || restoring || loadingTranscript || !text.trim()}
                            className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
                        >
                            {applying ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                            {applying ? 'Generando narración IA…' : 'Generar y aplicar voz'}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <p className="text-xs text-muted leading-relaxed">
                    Genera una narración completa con voces neuronales de alta fidelidad (100% gratis y sin límites).
                    Puedes editar el guion antes de generarlo para hacerlo más directo o viral.
                </p>

                {error && (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-input text-xs text-red-300">
                        {error}
                    </div>
                )}

                {/* Texto del clip */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                            <Sparkles size={12} className="text-brass" />
                            Guion / Texto que dirá la voz IA:
                        </label>
                        {loadingTranscript && (
                            <span className="text-[11px] text-muted flex items-center gap-1">
                                <Loader2 size={11} className="animate-spin" /> Cargando texto…
                            </span>
                        )}
                    </div>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                        placeholder="Escribe o edita lo que dirá la voz de IA en este clip…"
                        className="w-full bg-paper2 border border-rule rounded-input p-2.5 text-xs text-ink focus:border-brass outline-none resize-none leading-relaxed"
                    />
                </div>

                {/* Selector de Voces */}
                <div>
                    <label className="text-xs font-semibold text-ink block mb-2">
                        Selecciona el Locutor / Voz de IA:
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {voices.map((v) => {
                            const isSelected = selectedVoice === v.id;
                            return (
                                <div
                                    key={v.id}
                                    onClick={() => setSelectedVoice(v.id)}
                                    className={`p-2.5 rounded-input border cursor-pointer transition-all flex items-start gap-2.5 ${
                                        isSelected
                                            ? 'border-brass bg-brass/10'
                                            : 'border-rule hover:border-rule2 bg-paper2/50'
                                    }`}
                                >
                                    <span className="text-xl mt-0.5">{v.flag || '🎙️'}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="text-xs font-semibold text-ink truncate">{v.name}</h4>
                                            {v.badge && (
                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-brass/20 text-brass font-medium">
                                                    {v.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted leading-tight mt-0.5 line-clamp-2">{v.desc}</p>
                                    </div>
                                    <div className={`w-3.5 h-3.5 rounded-full border mt-1 flex items-center justify-center shrink-0 ${
                                        isSelected ? 'border-brass bg-brass text-black' : 'border-rule'
                                    }`}>
                                        {isSelected && <Check size={8} strokeWidth={3} />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Modo de Mezcla de Audio */}
                <div className="p-3 rounded-input border border-rule bg-paper3/30 space-y-3">
                    <label className="text-xs font-semibold text-ink block">
                        Modo de Mezcla:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div
                            onClick={() => setMode('ducking')}
                            className={`p-2.5 rounded-input border cursor-pointer transition-all ${
                                mode === 'ducking'
                                    ? 'border-brass bg-brass/10 text-ink'
                                    : 'border-rule bg-paper2/50 text-muted hover:text-ink'
                            }`}
                        >
                            <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                                <Radio size={12} className={mode === 'ducking' ? 'text-brass' : ''} />
                                Fondo atenuado (Recomendado)
                            </div>
                            <p className="text-[11px] text-muted leading-snug">
                                Mantiene el sonido original o música de fondo suavemente (15%) mientras la voz IA se escucha nítida al 100%.
                            </p>
                        </div>
                        <div
                            onClick={() => setMode('replace')}
                            className={`p-2.5 rounded-input border cursor-pointer transition-all ${
                                mode === 'replace'
                                    ? 'border-brass bg-brass/10 text-ink'
                                    : 'border-rule bg-paper2/50 text-muted hover:text-ink'
                            }`}
                        >
                            <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                                <Volume2 size={12} className={mode === 'replace' ? 'text-brass' : ''} />
                                Reemplazar completamente
                            </div>
                            <p className="text-[11px] text-muted leading-snug">
                                Silencia el audio original del video por completo y deja únicamente la voz del locutor de IA.
                            </p>
                        </div>
                    </div>

                    {/* Velocidad de la voz */}
                    <div className="pt-2">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted">Ritmo / Velocidad de lectura:</span>
                            <span className="text-ink font-mono">{speed.toFixed(2)}x {speed > 1.02 ? '(Dinámico TikTok)' : speed < 0.98 ? '(Pausado)' : '(Normal)'}</span>
                        </div>
                        <input
                            type="range"
                            min="0.85"
                            max="1.30"
                            step="0.05"
                            value={speed}
                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            className="w-full accent-brass"
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
