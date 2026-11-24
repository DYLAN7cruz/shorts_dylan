import React, { useState, useRef } from 'react';
import { 
    Upload, Link2, Type, Sparkles, Loader2, Download, RefreshCw, 
    Check, Play, Pause, AlertCircle, FileText, Palette, Sliders, Shield
} from 'lucide-react';
import { getApiUrl } from '../config';
import { apiFetch } from '../lib/api';

const VIRAL_PRESETS = [
    { 
        id: 'hormozi', 
        label: 'Hormozi Pop', 
        font: 'Montserrat ExtraBold', 
        color: '#FFFFFF', 
        highlight: '#FFE500', 
        effect: 'pop', 
        badge: 'Top Viral',
        desc: 'Texto blanco con pop amarillo vibrante y sombra' 
    },
    { 
        id: 'pill', 
        label: 'CapCut Pill', 
        font: 'Montserrat ExtraBold', 
        color: '#FFFFFF', 
        highlight: '#7C3AED', 
        effect: 'highlight', 
        badge: 'Trending',
        desc: 'Caja púrpura redondeada detrás de la palabra activa' 
    },
    { 
        id: 'lime', 
        label: 'Lime Submagic', 
        font: 'Montserrat ExtraBold', 
        color: '#FFFFFF', 
        highlight: '#A3FF12', 
        effect: 'highlight', 
        badge: 'Viral',
        desc: 'Caja verde lima fluorescente de alto impacto' 
    },
    { 
        id: 'beast_yellow', 
        label: 'MrBeast Viral', 
        font: 'The Bold Font', 
        color: '#FFFFFF', 
        highlight: '#FFFF00', 
        effect: 'pop', 
        badge: 'YouTube',
        desc: 'Fuente ultra gruesa con pop amarillo clásica de shorts' 
    },
    { 
        id: 'gamer', 
        label: 'Gamer / Comic', 
        font: 'Luckiest Guy', 
        color: '#FFFFFF', 
        highlight: '#00FF88', 
        effect: 'pop', 
        badge: 'Gaming',
        desc: 'Tipografía estilo caricatura/cómic con resalte verde' 
    },
    { 
        id: 'poppins_clean', 
        label: 'TikTok Clean', 
        font: 'Poppins', 
        color: '#FFFFFF', 
        highlight: '#FFE500', 
        effect: 'pop', 
        badge: 'Elegante',
        desc: 'Fuente geométrica moderna y limpia en minúsculas/mayúsculas' 
    },
    { 
        id: 'bebas_bold', 
        label: 'Cinemático', 
        font: 'Bebas Neue', 
        color: '#FFFFFF', 
        highlight: '#FF3333', 
        effect: 'pop', 
        badge: 'Titular',
        desc: 'Mayúsculas condensadas estilo cine con acento rojo' 
    },
    { 
        id: 'cover_box', 
        label: 'Tapa-Subtítulos', 
        font: 'Montserrat ExtraBold', 
        color: '#FFFFFF', 
        highlight: '#FFE500', 
        effect: 'pop', 
        badge: 'Utilidad',
        desc: 'Fondo negro 100% opaco para ocultar subtítulos originales' 
    },
];

const FONT_OPTIONS = [
    { value: 'Anton', label: 'Anton (Clásica Short)' },
    { value: 'Montserrat ExtraBold', label: 'Montserrat ExtraBold (Top TikTok)' },
    { value: 'The Bold Font', label: 'The Bold Font (MrBeast / Podcasts)' },
    { value: 'Bebas Neue', label: 'Bebas Neue (Titular Cinemático)' },
    { value: 'Archivo Black', label: 'Archivo Black (Ultra Gruesa)' },
    { value: 'Poppins', label: 'Poppins (Moderna y Limpia)' },
    { value: 'Luckiest Guy', label: 'Luckiest Guy (Divertida / Caricatura)' },
    { value: 'Impact', label: 'Impact (Contundente)' },
    { value: 'Verdana', label: 'Verdana (Simple)' },
];

const COLOR_PALETTE = [
    '#FFFFFF', '#FFE500', '#FFDD00', '#A3FF12', '#00FF88', 
    '#00FFFF', '#7C3AED', '#FF3366', '#FF4444', '#FF8800'
];

export default function AutoCaptionsTab() {
    const [mode, setMode] = useState('file'); // 'file' | 'url'
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('hormozi');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const [error, setError] = useState(null);

    // Studio Result State
    const [jobData, setJobData] = useState(null);
    const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
    const [captions, setCaptions] = useState([]);
    const [editableText, setEditableText] = useState('');
    const [showTextEditor, setShowTextEditor] = useState(false);

    // Styling Controls State
    const [fontName, setFontName] = useState('Montserrat ExtraBold');
    const [fontSize, setFontSize] = useState(44);
    const [fontColor, setFontColor] = useState('#FFFFFF');
    const [highlightColor, setHighlightColor] = useState('#FFE500');
    const [effect, setEffect] = useState('pop');
    const [borderWidth, setBorderWidth] = useState(4);
    const [yOffset, setYOffset] = useState(0.82);
    const [coverBox, setCoverBox] = useState(false);
    const [uppercase, setUppercase] = useState(true);

    // Translation State
    const [isTranslating, setIsTranslating] = useState(false);
    const [translateSuccess, setTranslateSuccess] = useState(false);

    // Re-burn State
    const [isApplying, setIsApplying] = useState(false);
    const [applySuccess, setApplySuccess] = useState(false);

    const videoRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setError(null);
        }
    };

    const handleApplyPreset = (preset) => {
        setSelectedPreset(preset.id);
        setFontName(preset.font);
        setFontColor(preset.color);
        setHighlightColor(preset.highlight);
        setEffect(preset.effect);
        if (preset.id === 'cover_box') {
            setCoverBox(true);
            setBorderWidth(4);
        } else {
            setCoverBox(false);
            setBorderWidth(preset.effect === 'highlight' ? 3 : 4);
        }
    };

    const handleProcess = async (e) => {
        e.preventDefault();
        if (mode === 'file' && !file) return;
        if (mode === 'url' && !url) return;

        setIsProcessing(true);
        setError(null);
        setProcessingStep('Subiendo video y preparando motor de transcripción...');

        try {
            let res;
            if (mode === 'file') {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('style_preset', selectedPreset);
                setProcessingStep('Transcribiendo audio palabra por palabra con Whisper...');
                res = await apiFetch('/api/captions/process', {
                    method: 'POST',
                    body: formData,
                });
            } else {
                setProcessingStep('Descargando video desde enlace...');
                res = await apiFetch('/api/captions/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: url.trim(),
                        style_preset: selectedPreset
                    })
                });
            }

            if (!res.ok) {
                let detail = 'Error procesando video';
                try { detail = (await res.json()).detail; } catch {}
                throw new Error(detail);
            }

            const data = await res.json();
            setJobData(data);
            setCurrentVideoUrl(getApiUrl(data.video_url));
            setCaptions(data.captions || []);
            setEditableText((data.captions || []).map(c => c.text).join(' '));

            // Sync initial style
            if (data.caption_style) {
                setFontName(data.caption_style.font_name || 'Montserrat ExtraBold');
                setFontSize(data.caption_style.font_size || 44);
                setFontColor(data.caption_style.font_color || '#FFFFFF');
                setHighlightColor(data.caption_style.highlight_color || '#FFE500');
                setEffect(data.caption_style.effect || 'pop');
                setBorderWidth(data.caption_style.border_width ?? 4);
            }
        } catch (err) {
            setError(err.message || 'Error al generar subtítulos.');
        } finally {
            setIsProcessing(false);
            setProcessingStep('');
        }
    };

    const handleTranslateSubtitles = async () => {
        if (!jobData) return;
        setIsTranslating(true);
        setError(null);
        try {
            const res = await apiFetch('/api/clip/translate-subtitles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobData.job_id,
                    clip_index: 0,
                    target_language: 'es',
                    burn: true
                })
            });
            if (!res.ok) {
                let detail = 'Error al traducir subtítulos';
                try { detail = (await res.json()).detail; } catch {}
                throw new Error(detail);
            }
            const data = await res.json();
            if (data.new_video_url) {
                setCurrentVideoUrl(getApiUrl(data.new_video_url));
                if (videoRef.current) videoRef.current.load();
            }
            if (data.captions) {
                setCaptions(data.captions);
                setEditableText(data.text || data.captions.map(c => c.text).join(' '));
            }
            setTranslateSuccess(true);
            setTimeout(() => setTranslateSuccess(false), 4000);
        } catch (err) {
            setError(err.message || 'Error traduciendo subtítulos.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleApplyStyle = async () => {
        if (!jobData) return;
        setIsApplying(true);
        setError(null);
        try {
            const wordsPayload = captions.map(c => ({
                text: c.text,
                startMs: c.startMs,
                endMs: c.endMs
            }));

            const res = await apiFetch('/api/subtitle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobData.job_id,
                    clip_index: 0,
                    style: 'karaoke',
                    font_name: fontName,
                    font_size: fontSize,
                    font_color: fontColor,
                    highlight_color: highlightColor,
                    effect: effect,
                    border_width: borderWidth,
                    border_color: '#000000',
                    bg_color: '#000000',
                    bg_opacity: coverBox ? 1.0 : 0.0,
                    base_opacity: 1.0,
                    uppercase: uppercase,
                    y_offset: yOffset,
                    words: wordsPayload
                })
            });

            if (!res.ok) {
                let detail = 'Error aplicando estilo de subtítulos';
                try { detail = (await res.json()).detail; } catch {}
                throw new Error(detail);
            }

            const data = await res.json();
            if (data.new_video_url) {
                setCurrentVideoUrl(getApiUrl(data.new_video_url));
                if (videoRef.current) videoRef.current.load();
                setApplySuccess(true);
                setTimeout(() => setApplySuccess(false), 3000);
            }
        } catch (err) {
            setError(err.message || 'Error aplicando nuevo diseño.');
        } finally {
            setIsApplying(false);
        }
    };

    const handleTextEdit = (newText) => {
        setEditableText(newText);
        const newWords = newText.split(/\s+/).filter(w => w.length > 0);
        if (newWords.length === 0 || captions.length === 0) return;

        const startMs = captions[0].startMs;
        const endMs = captions[captions.length - 1].endMs;
        const totalDuration = Math.max(1000, endMs - startMs);
        const step = totalDuration / newWords.length;

        const updated = newWords.map((word, i) => ({
            text: word,
            startMs: Math.round(startMs + i * step),
            endMs: Math.round(startMs + (i + 1) * step),
        }));
        setCaptions(updated);
    };

    const handleReset = () => {
        setJobData(null);
        setCurrentVideoUrl(null);
        setCaptions([]);
        setEditableText('');
        setFile(null);
        setUrl('');
        setError(null);
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 animate-fade">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-rule pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="badge-brass text-xs">NUEVO ESTUDIO</span>
                            <span className="text-xs text-muted">· Desde 10 seg hasta +30 min</span>
                        </div>
                        <h1 className="font-display lowercase text-2xl sm:text-3xl md:text-4xl text-ink mt-1 flex items-center gap-3">
                            <Type className="text-brass" size={28} />
                            Auto Subtítulos & Traducción
                        </h1>
                        <p className="text-xs sm:text-sm text-muted mt-1">
                            Sube cualquier video para subtitularlo con efectos virales que hablan al ritmo de la voz y traducirlos al español con 1 clic.
                        </p>
                    </div>

                    {jobData && (
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-3 py-2 text-xs rounded-input border border-rule hover:border-brass text-muted hover:text-ink transition-colors"
                        >
                            <RefreshCw size={14} /> Subir otro video
                        </button>
                    )}
                </div>

                {error && (
                    <div className="p-3.5 rounded-card bg-danger/10 border border-danger/30 text-danger text-xs sm:text-sm flex items-center gap-2.5">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* STEP 1: Upload / Input Form (When no video processed yet) */}
                {!jobData && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Left: Input Card */}
                        <div className="lg:col-span-7 card p-5 sm:p-6 space-y-5">
                            {/* Tabs: File vs URL */}
                            <div className="flex gap-4 border-b border-rule pb-3">
                                <button
                                    onClick={() => setMode('file')}
                                    className={`flex items-center gap-2 text-sm lowercase pb-2 border-b-2 transition-colors ${
                                        mode === 'file' ? 'text-ink border-brass font-medium' : 'text-muted border-transparent hover:text-ink2'
                                    }`}
                                >
                                    <Upload size={16} className={mode === 'file' ? 'text-brass' : ''} />
                                    Subir Archivo de Video
                                </button>
                                <button
                                    onClick={() => setMode('url')}
                                    className={`flex items-center gap-2 text-sm lowercase pb-2 border-b-2 transition-colors ${
                                        mode === 'url' ? 'text-ink border-brass font-medium' : 'text-muted border-transparent hover:text-ink2'
                                    }`}
                                >
                                    <Link2 size={16} className={mode === 'url' ? 'text-brass' : ''} />
                                    Pegar Enlace de Video
                                </button>
                            </div>

                            <form onSubmit={handleProcess} className="space-y-4">
                                {mode === 'file' ? (
                                    <div
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={handleDrop}
                                        className={`border-2 border-dashed rounded-card p-6 sm:p-8 text-center transition-colors ${
                                            file ? 'border-brass bg-brass/5' : 'border-rule2 hover:border-brass'
                                        }`}
                                    >
                                        {file ? (
                                            <div className="space-y-2">
                                                <div className="inline-flex items-center gap-2 text-brass font-medium text-sm">
                                                    <Check size={18} /> Video seleccionado:
                                                </div>
                                                <p className="text-sm font-semibold text-ink truncate max-w-md mx-auto">{file.name}</p>
                                                <p className="readout">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setFile(null)}
                                                    className="text-xs text-muted hover:text-danger underline mt-2"
                                                >
                                                    cambiar archivo
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer block">
                                                <input
                                                    type="file"
                                                    accept="video/*"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                                <Upload className="mx-auto mb-3 text-muted" size={24} />
                                                <p className="text-sm text-ink2 font-medium lowercase">
                                                    Haz clic para subir o arrastra tu video aquí
                                                </p>
                                                <p className="readout mt-1.5">
                                                    MP4, MOV, WEBM · Desde 10 segundos hasta videos largos
                                                </p>
                                            </label>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="eyebrow block">URL DEL VIDEO</label>
                                        <div className="relative">
                                            <input
                                                type="url"
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                placeholder="https://... pega un enlace de YouTube, TikTok, etc."
                                                className="input-field pr-10"
                                                required
                                            />
                                            <Link2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
                                        </div>
                                        <p className="text-[11px] text-muted">
                                            Compatible con YouTube, TikTok, Reels, Twitter, Twitch, Vimeo y +1000 sitios.
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isProcessing || (mode === 'file' && !file) || (mode === 'url' && !url)}
                                    className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-medium mt-4 shadow-lg shadow-brass/10"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>{processingStep || 'Procesando video...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            <span>Generar Subtítulos con IA</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Right: Presets Gallery preview */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="card p-5">
                                <h2 className="eyebrow text-muted mb-3 flex items-center gap-2">
                                    <Sparkles size={14} className="text-brass" /> ESTILOS VIRALES DISPONIBLES
                                </h2>
                                <p className="text-xs text-muted mb-3">
                                    Elige el estilo que se aplicará por defecto. Podrás cambiar tipografías, colores y efectos después.
                                </p>
                                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                                    {VIRAL_PRESETS.map((p) => {
                                        const active = selectedPreset === p.id;
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => handleApplyPreset(p)}
                                                className={`w-full text-left p-2.5 rounded-input border transition-all flex items-center justify-between ${
                                                    active ? 'border-brass bg-brass/10' : 'border-rule hover:border-rule2'
                                                }`}
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-ink">{p.label}</span>
                                                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-paper3 text-muted">{p.badge}</span>
                                                    </div>
                                                    <p className="text-[11px] text-muted truncate mt-0.5">{p.desc}</p>
                                                </div>
                                                <div 
                                                    className="w-6 h-6 rounded-full border border-rule flex items-center justify-center shrink-0 text-xs font-bold"
                                                    style={{ backgroundColor: p.highlight, color: '#000000' }}
                                                >
                                                    A
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* STEP 2: Studio / Editor (When video is processed) */}
                {jobData && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                        {/* Left: Video Preview & Direct Download */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="card p-3 sm:p-4 bg-black rounded-card border border-rule overflow-hidden flex flex-col items-center">
                                <video
                                    ref={videoRef}
                                    src={currentVideoUrl}
                                    controls
                                    playsInline
                                    className="w-full max-h-[580px] object-contain rounded-input"
                                />

                                <div className="w-full flex items-center justify-between gap-2 mt-3 pt-3 border-t border-rule text-xs text-muted">
                                    <span>Duración: {Math.round(jobData.duration)}s</span>
                                    {jobData.width && jobData.height && (
                                        <span>{jobData.width}×{jobData.height}</span>
                                    )}
                                    <span className="text-brass">Idioma: {jobData.language?.toUpperCase() || 'ES'}</span>
                                </div>
                            </div>

                            {/* Download Action Card */}
                            <div className="card p-4 space-y-3">
                                <a
                                    href={currentVideoUrl}
                                    download={`subtitled_${jobData.job_id}.mp4`}
                                    className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-brass/10"
                                >
                                    <Download size={18} />
                                    Descargar Video Subtitulado MP4
                                </a>
                                <p className="text-center text-[11px] text-muted">
                                    Video procesado en alta resolución con subtítulos quemados en el archivo.
                                </p>
                            </div>
                        </div>

                        {/* Right: Customization Controls & 1-Click Translation */}
                        <div className="lg:col-span-7 space-y-5">

                            {/* 1-Click Translation Banner */}
                            <div className="card p-4 sm:p-5 border-brass/50 bg-brass/5 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                                        <Sparkles className="text-brass" size={18} />
                                        <span>Traducción Inteligente a Español</span>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass/20 text-brass font-bold">GEMINI AI</span>
                                </div>
                                <p className="text-xs text-muted leading-relaxed">
                                    ¿Tu video está en inglés u otro idioma? Traduce automáticamente todo el texto a un español neutro y conversacional manteniendo los tiempos exactos de voz.
                                </p>
                                <button
                                    onClick={handleTranslateSubtitles}
                                    disabled={isTranslating}
                                    className="w-full py-2.5 px-4 rounded-input bg-brass text-black font-semibold text-xs sm:text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md shadow-brass/20 disabled:opacity-50"
                                >
                                    {isTranslating ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Traduciendo y sincronizando subtítulos con IA...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} />
                                            <span>{translateSuccess ? '¡Subtítulos Traducidos y Quemados! ✓' : 'Traducir Subtítulos a Español ✨'}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Style Customizer Card */}
                            <div className="card p-5 space-y-5">
                                <div className="flex items-center justify-between border-b border-rule pb-3">
                                    <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                                        <Palette size={16} className="text-brass" /> Personalizar Diseño y Tipografía
                                    </h3>
                                    {applySuccess && (
                                        <span className="text-xs text-ok font-medium animate-fade">¡Estilo aplicado! ✓</span>
                                    )}
                                </div>

                                {/* Preset Pills */}
                                <div>
                                    <label className="eyebrow block mb-2">PRESETS RÁPIDOS</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {VIRAL_PRESETS.map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => handleApplyPreset(p)}
                                                className={`px-2.5 py-1 text-xs rounded-input border transition-all ${
                                                    selectedPreset === p.id 
                                                        ? 'border-brass bg-brass text-black font-semibold' 
                                                        : 'border-rule bg-paper3 text-ink2 hover:border-rule2'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Font Selector */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="eyebrow block mb-1.5">FUENTE VIRAL</label>
                                        <select
                                            value={fontName}
                                            onChange={(e) => setFontName(e.target.value)}
                                            className="input-field text-xs py-2"
                                        >
                                            {FONT_OPTIONS.map((f) => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="eyebrow block mb-1.5">EFECTO DE ANIMACIÓN</label>
                                        <select
                                            value={effect}
                                            onChange={(e) => setEffect(e.target.value)}
                                            className="input-field text-xs py-2"
                                        >
                                            <option value="pop">Pop (Palabra crece al hablarse)</option>
                                            <option value="highlight">Highlight Box (Caja en palabra activa)</option>
                                            <option value="glow">Glow (Resplandor neón)</option>
                                            <option value="none">Estático (Sin animación)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Colors */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="eyebrow block mb-1.5">COLOR DE TEXTO BASE</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={fontColor}
                                                onChange={(e) => setFontColor(e.target.value)}
                                                className="w-8 h-8 rounded-full border border-rule cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={fontColor}
                                                onChange={(e) => setFontColor(e.target.value)}
                                                className="input-field font-mono text-xs uppercase"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="eyebrow block mb-1.5">COLOR DE RESALTE / CAJA</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={highlightColor}
                                                onChange={(e) => setHighlightColor(e.target.value)}
                                                className="w-8 h-8 rounded-full border border-rule cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={highlightColor}
                                                onChange={(e) => setHighlightColor(e.target.value)}
                                                className="input-field font-mono text-xs uppercase"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Size & Position */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="eyebrow">TAMAÑO DE FUENTE</label>
                                            <span className="text-xs font-mono text-muted">{fontSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="20"
                                            max="80"
                                            value={fontSize}
                                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                                            className="w-full accent-brass cursor-pointer"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="eyebrow">ALTURA VERTICAL</label>
                                            <span className="text-xs font-mono text-muted">{Math.round(yOffset * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="0.95"
                                            step="0.02"
                                            value={yOffset}
                                            onChange={(e) => setYOffset(parseFloat(e.target.value))}
                                            className="w-full accent-brass cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* Toggles */}
                                <div className="flex flex-wrap items-center gap-5 pt-3 border-t border-rule text-xs text-ink2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={uppercase}
                                            onChange={(e) => setUppercase(e.target.checked)}
                                            className="w-4 h-4 accent-brass"
                                        />
                                        <span>MAYÚSCULAS VIRALES</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={coverBox}
                                            onChange={(e) => setCoverBox(e.target.checked)}
                                            className="w-4 h-4 accent-brass"
                                        />
                                        <span>Tapar subtítulos originales (Fondo negro)</span>
                                    </label>
                                </div>

                                {/* Apply Style Button */}
                                <button
                                    onClick={handleApplyStyle}
                                    disabled={isApplying}
                                    className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold"
                                >
                                    {isApplying ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Quemando subtítulos en video...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Palette size={16} />
                                            <span>Aplicar Diseño & Re-quemar Video</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Transcript Text Editor */}
                            <div className="card p-4 space-y-3">
                                <button
                                    type="button"
                                    onClick={() => setShowTextEditor(!showTextEditor)}
                                    className="w-full flex items-center justify-between text-left"
                                >
                                    <span className="eyebrow flex items-center gap-2">
                                        <FileText size={14} className="text-brass" /> EDITAR TEXTO DE SUBTÍTULOS ({captions.length} palabras)
                                    </span>
                                    <span className={`text-muted transition-transform ${showTextEditor ? 'rotate-180' : ''}`}>▾</span>
                                </button>

                                {showTextEditor && (
                                    <div className="space-y-3 animate-fade">
                                        <textarea
                                            value={editableText}
                                            onChange={(e) => handleTextEdit(e.target.value)}
                                            rows={6}
                                            dir="auto"
                                            className="input-field resize-none leading-relaxed text-xs"
                                            placeholder="Edita la transcripción palabra por palabra..."
                                        />
                                        <p className="text-[11px] text-muted">
                                            Al modificar el texto, presiona <strong>"Aplicar Diseño & Re-quemar Video"</strong> arriba para grabarlo en el video.
                                        </p>
                                    </div>
                                )}
                            </div>

                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
