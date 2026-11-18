import React, { useState } from 'react';
import { Tag, Loader2, Check, Eye } from 'lucide-react';
import Modal from './ui/Modal';
import { apiFetch } from '../lib/api';

const POSITIONS = [
    { id: 'top_center', label: 'Arriba Centro' },
    { id: 'top_left', label: 'Arriba Izquierda' },
    { id: 'bottom_center', label: 'Abajo Centro' },
    { id: 'bottom_right', label: 'Abajo Derecha' },
];

export default function BrandWatermarkModal({ isOpen, onClose, jobId, clipIndex, currentVideoUrl, onWatermarkApplied }) {
    const [text, setText] = useState(() => {
        try { return localStorage.getItem('os_user_watermark') || '@tu_canal'; } catch { return '@tu_canal'; }
    });
    const [position, setPosition] = useState('top_center');
    const [opacity, setOpacity] = useState(0.75);
    const [fontSize, setFontSize] = useState(26);
    const [boxBg, setBoxBg] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleApply = async () => {
        if (!text.trim()) {
            setError('Ingresa el texto de tu marca o usuario');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            try { localStorage.setItem('os_user_watermark', text.trim()); } catch (_) {}

            const serverVideoFile = currentVideoUrl ? currentVideoUrl.split('/').pop() : null;
            const res = await apiFetch('/api/clip/watermark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: clipIndex,
                    input_filename: serverVideoFile,
                    text: text.trim(),
                    position,
                    opacity: Number(opacity),
                    font_size: Number(fontSize),
                    box_bg: boxBg
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Error al aplicar marca de agua');
            }

            const data = await res.json();
            if (data.new_video_url && onWatermarkApplied) {
                onWatermarkApplied(data.new_video_url);
            }
            onClose();
        } catch (e) {
            setError(e?.message || 'Error al estampar tu marca');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            eyebrow="BRANDING PERSONAL"
            title="Marca de Agua y Firma de Canal"
            footer={
                <div className="flex gap-2 w-full justify-end">
                    <button onClick={onClose} disabled={loading} className="btn-quiet py-2 px-4 text-xs">
                        Cancelar
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={loading || !text.trim()}
                        className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
                        {loading ? 'Aplicando marca…' : 'Estampar en clip'}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-xs text-muted leading-relaxed">
                    Firma tus videos automáticamente con tu <strong>@usuario</strong> o nombre de marca para evitar que otros te roben los clips y ganar seguidores en tus redes.
                </p>

                {error && (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-input text-xs text-red-300">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">
                        Tu Usuario o Texto de Marca:
                    </label>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Ejemplo: @dylan_clips"
                        className="input-field w-full font-semibold"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">
                        Ubicación en el video:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {POSITIONS.map((pos) => (
                            <button
                                key={pos.id}
                                type="button"
                                onClick={() => setPosition(pos.id)}
                                className={`p-2.5 rounded-input border text-xs text-center transition-all ${
                                    position === pos.id
                                        ? 'border-brass bg-brass/10 text-ink font-medium'
                                        : 'border-rule text-muted hover:border-rule2'
                                }`}
                            >
                                {pos.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted">Opacidad:</span>
                            <span className="text-ink font-mono">{Math.round(opacity * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0.3"
                            max="1.0"
                            step="0.05"
                            value={opacity}
                            onChange={(e) => setOpacity(parseFloat(e.target.value))}
                            className="w-full accent-brass"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted">Tamaño:</span>
                            <span className="text-ink font-mono">{fontSize}px</span>
                        </div>
                        <input
                            type="range"
                            min="18"
                            max="44"
                            step="2"
                            value={fontSize}
                            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                            className="w-full accent-brass"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <label className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-ink">
                        <input
                            type="checkbox"
                            checked={boxBg}
                            onChange={(e) => setBoxBg(e.target.checked)}
                            className="rounded accent-brass"
                        />
                        Fondo oscuro semitransparente (para máxima legibilidad)
                    </label>
                </div>

                {/* Live Preview Box */}
                <div className="mt-2 p-3 rounded-input border border-rule bg-black flex items-center justify-center relative h-20 overflow-hidden">
                    <span className="text-[10px] text-muted absolute top-1 left-2 flex items-center gap-1">
                        <Eye size={10} /> Vista previa de tu marca:
                    </span>
                    <span
                        style={{
                            opacity: opacity,
                            fontSize: `${Math.min(fontSize, 22)}px`,
                            backgroundColor: boxBg ? 'rgba(0,0,0,0.55)' : 'transparent',
                            padding: boxBg ? '4px 12px' : '0',
                            borderRadius: '6px'
                        }}
                        className="text-white font-extrabold tracking-wide"
                    >
                        {text || '@tu_canal'}
                    </span>
                </div>
            </div>
        </Modal>
    );
}
