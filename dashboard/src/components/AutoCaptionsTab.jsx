import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Upload, Link2, Type, Sparkles, Loader2, Download, RefreshCw, 
    Check, Play, Pause, AlertCircle, FileText, Palette, Sliders, 
    Move, Eye, AlignCenter, ArrowUp, ArrowDown, LayoutTemplate
} from 'lucide-react';
import { getApiUrl } from '../config';
import { apiFetch } from '../lib/api';

const VIRAL_PRESETS = [
    { 
        id: 'lime', 
        label: 'Lime Submagic', 
        font: 'Montserrat ExtraBold', 
        color: '#FFFFFF', 
        highlight: '#A3FF12', 
        effect: 'highlight', 
        badge: 'Viral',
        desc: 'Caja verde lima fluorescente enmarcando palabra' 
    },
    { 
        id: 'pill', 
        label: 'CapCut Pill', 
        font: 'Montserrat ExtraBold', 
        color: '#FFFFFF', 
        highlight: '#7C3AED', 
        effect: 'highlight', 
        badge: 'Trending',
        desc: 'Caja púrpura redondeada en palabra activa' 
    },
    { 
        id: 'beast_yellow', 
        label: 'MrBeast Viral', 
        font: 'The Bold Font', 
        color: '#FFFFFF', 
        highlight: '#FFFF00', 
        effect: 'pop', 
        badge: 'YouTube',
        desc: 'Fuente ultra gruesa con pop amarillo clásica' 
    },
    { 
        id: 'hormozi', 
        label: 'Hormozi Pop', 
        font: 'Montserrat ExtraBold', 
        color: '#FFFFFF', 
        highlight: '#FFE500', 
        effect: 'pop', 
        badge: 'Top Viral',
        desc: 'Texto blanco con pop amarillo vibrante' 
    },
    { 
        id: 'gamer', 
        label: 'Gamer / Comic', 
        font: 'Luckiest Guy', 
        color: '#FFFFFF', 
        highlight: '#00FF88', 
        effect: 'pop', 
        badge: 'Gaming',
        desc: 'Estilo cómic/caricatura con resalte verde' 
    },
    { 
        id: 'poppins_clean', 
        label: 'TikTok Clean', 
        font: 'Poppins', 
        color: '#FFFFFF', 
        highlight: '#FFE500', 
        effect: 'pop', 
        badge: 'Elegante',
        desc: 'Geométrica moderna y limpia' 
    },
    { 
        id: 'bebas_bold', 
        label: 'Cinemático', 
        font: 'Bebas Neue', 
        color: '#FFFFFF', 
        highlight: '#FF3333', 
        effect: 'pop', 
        badge: 'Titular',
        desc: 'Mayúsculas condensadas estilo cine' 
    },
    { 
        id: 'cover_box', 
        label: 'Tapa-Subtítulos', 
        font: 'Montserrat ExtraBold', 
        color: '#FFFFFF', 
        highlight: '#FFE500', 
        effect: 'pop', 
        badge: 'Utilidad',
        desc: 'Fondo negro 100% opaco para tapar previos' 
    },
];

const FONT_OPTIONS = [
    { value: 'Anton', label: 'Anton', category: 'Clásica Shorts & Reels' },
    { value: 'Montserrat ExtraBold', label: 'Montserrat ExtraBold', category: 'Top TikTok / Hormozi' },
    { value: 'The Bold Font', label: 'The Bold Font', category: 'Estilo MrBeast' },
    { value: 'Bebas Neue', label: 'Bebas Neue', category: 'Titulares Cinemáticos' },
    { value: 'Archivo Black', label: 'Archivo Black', category: 'Ultra Gruesa e Impactante' },
    { value: 'Poppins', label: 'Poppins', category: 'Moderna, Redondeada y Limpia' },
    { value: 'Luckiest Guy', label: 'Luckiest Guy', category: 'Divertida / Estilo Caricatura' },
    { value: 'Impact', label: 'Impact', category: 'Contundente Clásica' },
    { value: 'Verdana', label: 'Verdana', category: 'Simple y Neutra' },
];

// Colores rápidos para la caja / resalte de la palabra activa
const HIGHLIGHT_COLOR_PRESETS = [
    { name: 'Verde Lima', hex: '#A3FF12' },
    { name: 'Amarillo Viral', hex: '#FFE500' },
    { name: 'Púrpura CapCut', hex: '#7C3AED' },
    { name: 'Cyan Neón', hex: '#00FFFF' },
    { name: 'Rojo Fuego', hex: '#FF3333' },
    { name: 'Naranja Flúor', hex: '#FF8800' },
    { name: 'Rosa Neón', hex: '#FF3366' },
    { name: 'Verde Gamer', hex: '#00FF88' },
    { name: 'Azul Eléctrico', hex: '#2563EB' },
    { name: 'Blanco Puro', hex: '#FFFFFF' },
];

// Colores rápidos para el texto base
const BASE_COLOR_PRESETS = [
    { name: 'Blanco', hex: '#FFFFFF' },
    { name: 'Amarillo', hex: '#FFE500' },
    { name: 'Verde Lima', hex: '#A3FF12' },
    { name: 'Cyan', hex: '#00FFFF' },
    { name: 'Gris Claro', hex: '#E2E8F0' },
    { name: 'Negro', hex: '#000000' },
];

/**
 * Calcula si el texto sobre una caja de color debe ser negro o blanco
 * según la luminosidad percibida (fórmula Rec. 601 idéntica al backend)
 */
function getContrastColor(hexColor) {
    const hex = (hexColor || '').replace('#', '');
    if (hex.length !== 6) return '#000000';
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.58 ? '#000000' : '#FFFFFF';
}

/**
 * Agrupa palabras en bloques de subtítulos cortos (1 línea)
 * para evitar que las frases largas salten hacia arriba.
 */
function buildSubtitleBlocks(wordsList, isSingleLine = true, charLimit = 12) {
    if (!wordsList || wordsList.length === 0) return [];
    const blocks = [];
    let currentWords = [];
    let currentLength = 0;
    let blockStart = 0;

    for (let i = 0; i < wordsList.length; i++) {
        const item = wordsList[i];
        const text = item.text || '';
        const start = item.startMs ?? 0;
        const end = item.endMs ?? start + 200;

        if (currentWords.length === 0) {
            currentWords = [item];
            currentLength = text.length;
            blockStart = start;
        } else {
            const blockDuration = (end - blockStart) / 1000.0;
            const maxCharsAllowed = isSingleLine ? charLimit : 22;
            const willExceedChars = (currentLength + 1 + text.length) > maxCharsAllowed;
            const willExceedTime = blockDuration > (isSingleLine ? 1.5 : 2.5);

            if (willExceedChars || willExceedTime) {
                blocks.push({
                    startMs: currentWords[0].startMs,
                    endMs: currentWords[currentWords.length - 1].endMs,
                    words: currentWords,
                    text: currentWords.map(w => w.text).join(' ')
                });
                currentWords = [item];
                currentLength = text.length;
                blockStart = start;
            } else {
                currentWords.push(item);
                currentLength += 1 + text.length;
            }
        }
    }

    if (currentWords.length > 0) {
        blocks.push({
            startMs: currentWords[0].startMs,
            endMs: currentWords[currentWords.length - 1].endMs,
            words: currentWords,
            text: currentWords.map(w => w.text).join(' ')
        });
    }

    return blocks;
}

export default function AutoCaptionsTab() {
    const [mode, setMode] = useState('file'); // 'file' | 'url'
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('lime');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const [error, setError] = useState(null);

    // Studio Result State
    const [jobData, setJobData] = useState(null);
    const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
    const [rawVideoUrl, setRawVideoUrl] = useState(null);
    const [burnedVideoUrl, setBurnedVideoUrl] = useState(null);
    const [activeViewMode, setActiveViewMode] = useState('interactive'); // 'interactive' | 'burned'
    const [captions, setCaptions] = useState([]);
    const [editableText, setEditableText] = useState('');
    const [showTextEditor, setShowTextEditor] = useState(false);

    // Styling Controls State
    const [fontName, setFontName] = useState('Montserrat ExtraBold');
    const [fontSize, setFontSize] = useState(44);
    const [fontColor, setFontColor] = useState('#FFFFFF');
    const [highlightColor, setHighlightColor] = useState('#A3FF12'); // Color de caja / resalte
    const [effect, setEffect] = useState('highlight'); // 'highlight' (caja pill) | 'pop' | 'glow' | 'none'
    const [borderWidth, setBorderWidth] = useState(3);
    const [coverBox, setCoverBox] = useState(false);
    const [uppercase, setUppercase] = useState(true);

    // Positioning State (Free Interactive Drag & Drop + Sliders)
    const [yOffset, setYOffset] = useState(0.80); // 80% from top (bottom area)
    const [xOffset, setXOffset] = useState(0.50); // 50% from left (centered)
    const [isDragging, setIsDragging] = useState(false);

    // Side Margin & Single Line Mode (Anti-desborde vertical)
    const [singleLine, setSingleLine] = useState(true); // 1 sola línea mode
    const [sideMarginWidth, setSideMarginWidth] = useState(82); // % max width (safe margin)
    const [showMarginGuides, setShowMarginGuides] = useState(false);

    // Video Playback & Time Synchronization State
    const [currentTimeMs, setCurrentTimeMs] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [containerWidth, setContainerWidth] = useState(480);
    const [forcePreviewWhenPaused, setForcePreviewWhenPaused] = useState(false);

    // Translation State
    const [isTranslating, setIsTranslating] = useState(false);
    const [translateSuccess, setTranslateSuccess] = useState(false);

    // Export / Final Burn State
    const [isApplying, setIsApplying] = useState(false);
    const [applySuccess, setApplySuccess] = useState(false);
    const [lastBurnedSignature, setLastBurnedSignature] = useState(null);

    const videoRef = useRef(null);
    const videoContainerRef = useRef(null);

    // Track active style signature to reliably detect unburned customizations
    const currentSignature = useMemo(() => {
        return JSON.stringify({
            fontName,
            fontSize,
            fontColor,
            highlightColor,
            effect,
            borderWidth,
            coverBox,
            uppercase,
            yOffset,
            xOffset,
            singleLine,
            sideMarginWidth,
            words: (captions || []).map(c => `${c.startMs}-${c.endMs}-${c.text}`).join('|')
        });
    }, [
        fontName, fontSize, fontColor, highlightColor, effect,
        borderWidth, coverBox, uppercase, yOffset, xOffset,
        singleLine, sideMarginWidth, captions
    ]);

    // Has user modified anything (font, color, position, margins, singleLine, text) since last burn?
    const isDirty = useMemo(() => {
        if (!jobData) return false;
        if (!lastBurnedSignature) return true;
        return currentSignature !== lastBurnedSignature;
    }, [jobData, lastBurnedSignature, currentSignature]);

    // Track container width for true proportional preview font sizing
    useEffect(() => {
        if (!videoContainerRef.current) return;
        const ro = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.contentRect.width > 0) {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });
        ro.observe(videoContainerRef.current);
        return () => ro.disconnect();
    }, [jobData]);

    // High-precision 60fps playhead tracking so subtitle disappears the exact millisecond speech ends
    useEffect(() => {
        let animId;
        const tick = () => {
            if (videoRef.current && !videoRef.current.paused) {
                setCurrentTimeMs(Math.round(videoRef.current.currentTime * 1000));
                animId = requestAnimationFrame(tick);
            }
        };
        if (isPlaying) {
            animId = requestAnimationFrame(tick);
        }
        return () => {
            if (animId) cancelAnimationFrame(animId);
        };
    }, [isPlaying]);

    // Global drag release listener
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) setIsDragging(false);
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('touchend', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('touchend', handleGlobalMouseUp);
        };
    }, [isDragging]);

    // Build subtitle blocks according to single-line mode
    const subtitleBlocks = useMemo(() => {
        return buildSubtitleBlocks(captions, singleLine, 12);
    }, [captions, singleLine]);

    // Active subtitle block: STRICTLY DISAPPEARS when speech ends or during silence
    const activeBlockData = useMemo(() => {
        if (!subtitleBlocks || subtitleBlocks.length === 0) return null;

        // Check if current time is strictly within any spoken phrase (+ 100ms smooth tail)
        const matched = subtitleBlocks.find(
            b => currentTimeMs >= b.startMs && currentTimeMs <= (b.endMs + 100)
        );
        if (matched) return matched;

        // Only when paused at the very beginning (0s), show first block as initial reference
        if (!isPlaying && currentTimeMs < 500 && subtitleBlocks.length > 0) {
            return subtitleBlocks[0];
        }

        // If user explicitly enabled preview while paused on a silent frame
        if (!isPlaying && forcePreviewWhenPaused && subtitleBlocks.length > 0) {
            let closest = subtitleBlocks[0];
            let minDiff = Math.abs(currentTimeMs - closest.startMs);
            for (let i = 1; i < subtitleBlocks.length; i++) {
                const diff = Math.abs(currentTimeMs - subtitleBlocks[i].startMs);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = subtitleBlocks[i];
                }
            }
            return closest;
        }

        // Outside of spoken words (silence, speech finished, end of video):
        // TEXT COMPLETELY DISAPPEARS!
        return null;
    }, [subtitleBlocks, currentTimeMs, isPlaying, forcePreviewWhenPaused]);

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
            
            const rawUrl = data.raw_video_url ? getApiUrl(data.raw_video_url) : getApiUrl(data.video_url);
            const burnedUrl = data.video_url ? getApiUrl(data.video_url) : null;
            
            setRawVideoUrl(rawUrl);
            setBurnedVideoUrl(burnedUrl);
            setCurrentVideoUrl(rawUrl); // Start with clean raw video for 0ms live interactive preview!
            setActiveViewMode('interactive');

            setCaptions(data.captions || []);
            setEditableText((data.captions || []).map(c => c.text).join(' '));

            // Sync initial style
            const initStyle = data.caption_style || {};
            const initialFontName = initStyle.font_name || 'Montserrat ExtraBold';
            const initialFontSize = initStyle.font_size || 44;
            const initialFontColor = initStyle.font_color || '#FFFFFF';
            const initialHighlightColor = initStyle.highlight_color || '#A3FF12';
            const initialEffect = initStyle.effect || 'highlight';
            const initialBorderWidth = initStyle.border_width ?? 3;

            setFontName(initialFontName);
            setFontSize(initialFontSize);
            setFontColor(initialFontColor);
            setHighlightColor(initialHighlightColor);
            setEffect(initialEffect);
            setBorderWidth(initialBorderWidth);

            // Compute signature for the auto-burned initial video
            const initialSig = JSON.stringify({
                fontName: initialFontName,
                fontSize: initialFontSize,
                fontColor: initialFontColor,
                highlightColor: initialHighlightColor,
                effect: initialEffect,
                borderWidth: initialBorderWidth,
                coverBox: false,
                uppercase: true,
                yOffset: 0.80,
                xOffset: 0.50,
                singleLine: true,
                sideMarginWidth: 82,
                words: (data.captions || []).map(c => `${c.startMs}-${c.endMs}-${c.text}`).join('|')
            });
            setLastBurnedSignature(initialSig);
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
                    burn: false // Translate text instantly for live preview!
                })
            });
            if (!res.ok) {
                let detail = 'Error al traducir subtítulos';
                try { detail = (await res.json()).detail; } catch {}
                throw new Error(detail);
            }
            const data = await res.json();
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

    // Native direct file download via dedicated attachment endpoint
    const triggerFileDownload = (videoPath) => {
        if (!jobData || !videoPath) return;
        const filename = videoPath.split('/').pop().split('?')[0];
        const downloadUrl = getApiUrl(`/api/download/${jobData.job_id}/${filename}?v=${Date.now()}`);

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            try { document.body.removeChild(link); } catch (_) {}
        }, 2000);
    };

    // Burn / Export final video with FFmpeg using exact styling, 1-line mode & margins
    const handleExportFinalVideo = async (autoDownload = true) => {
        if (!jobData) return;
        setIsApplying(true);
        setError(null);
        try {
            const wordsPayload = captions.map(c => ({
                text: c.text,
                startMs: c.startMs,
                endMs: c.endMs
            }));

            // Convert sideMarginWidth into margin_h units for ASS
            const marginH = Math.max(5, Math.min(80, Math.round(288 * 9 / 16 * ((100 - sideMarginWidth) / 200))));
            const maxChars = singleLine ? 12 : 22;

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
                    margin_h: marginH,
                    single_line: singleLine,
                    max_chars: maxChars,
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
                // Cache-busting query to guarantee browser plays and downloads latest video
                const timestamp = Date.now();
                const freshUrl = `${getApiUrl(data.new_video_url)}?v=${timestamp}`;
                setBurnedVideoUrl(freshUrl);
                setCurrentVideoUrl(freshUrl);
                setActiveViewMode('burned');
                setLastBurnedSignature(currentSignature);
                if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.currentTime = 0;
                }
                setApplySuccess(true);
                setTimeout(() => setApplySuccess(false), 5000);

                if (autoDownload) {
                    triggerFileDownload(data.new_video_url);
                }
            }
        } catch (err) {
            setError(err.message || 'Error exportando video subtitulado.');
        } finally {
            setIsApplying(false);
        }
    };

    // Primary action: If there are unsaved edits, burn and download; otherwise download directly
    const handleSaveAndDownload = async () => {
        if (!jobData || isApplying) return;
        if (isDirty || !burnedVideoUrl) {
            await handleExportFinalVideo(true);
        } else {
            triggerFileDownload(burnedVideoUrl);
            setApplySuccess(true);
            setTimeout(() => setApplySuccess(false), 4000);
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
        setRawVideoUrl(null);
        setBurnedVideoUrl(null);
        setLastBurnedSignature(null);
        setCaptions([]);
        setEditableText('');
        setFile(null);
        setUrl('');
        setError(null);
    };

    // Video Timeupdate
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTimeMs(Math.round(videoRef.current.currentTime * 1000));
        }
    };

    // Drag & Drop handlers on Subtitle Box
    const handleSubtitleMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleSubtitleTouchStart = (e) => {
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleContainerMouseMove = (e) => {
        if (!isDragging || !videoContainerRef.current) return;
        const rect = videoContainerRef.current.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;
        const newX = Math.max(0.12, Math.min(0.88, (clientX - rect.left) / rect.width));
        const newY = Math.max(0.08, Math.min(0.92, (clientY - rect.top) / rect.height));
        setXOffset(parseFloat(newX.toFixed(3)));
        setYOffset(parseFloat(newY.toFixed(3)));
    };

    const handleContainerTouchMove = (e) => {
        if (!isDragging || !videoContainerRef.current || !e.touches || !e.touches[0]) return;
        const rect = videoContainerRef.current.getBoundingClientRect();
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        const newX = Math.max(0.12, Math.min(0.88, (clientX - rect.left) / rect.width));
        const newY = Math.max(0.08, Math.min(0.92, (clientY - rect.top) / rect.height));
        setXOffset(parseFloat(newX.toFixed(3)));
        setYOffset(parseFloat(newY.toFixed(3)));
    };

    // Calculate real-time preview font size proportional to container width
    const previewFontSize = Math.max(16, Math.min(48, Math.round(fontSize * (containerWidth / 720))));

    // Helper to render individual words with active viral styling
    const renderWord = (wordItem, isActive, idx) => {
        const text = uppercase ? (wordItem.text || '').toUpperCase() : (wordItem.text || '');
        
        const strokeStyle = borderWidth > 0 ? {
            WebkitTextStroke: `${Math.max(1, Math.round(borderWidth * 0.7))}px #000000`,
            paintOrder: 'stroke fill',
        } : {};

        if (isActive) {
            if (effect === 'highlight') {
                // Word inside a colored pill box (e.g. Lime Submagic, CapCut Pill)
                const textColorOnPill = getContrastColor(highlightColor);
                return (
                    <span
                        key={idx}
                        style={{
                            backgroundColor: highlightColor,
                            color: textColorOnPill,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            display: 'inline-block',
                            margin: '0 3px',
                            fontWeight: 900,
                            WebkitTextStroke: '0px transparent',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                            transform: 'scale(1.05)',
                            transition: 'background-color 0.15s ease, color 0.15s ease',
                        }}
                    >
                        {text}
                    </span>
                );
            } else if (effect === 'pop') {
                // Word pops in scale and color
                return (
                    <span
                        key={idx}
                        style={{
                            ...strokeStyle,
                            color: highlightColor,
                            display: 'inline-block',
                            transform: 'scale(1.18)',
                            transformOrigin: 'center bottom',
                            transition: 'transform 0.08s ease-out',
                            margin: '0 4px',
                            fontWeight: 900,
                        }}
                    >
                        {text}
                    </span>
                );
            } else if (effect === 'glow') {
                // Word with neon glow
                return (
                    <span
                        key={idx}
                        style={{
                            ...strokeStyle,
                            color: '#FFFFFF',
                            display: 'inline-block',
                            margin: '0 4px',
                            textShadow: `0 0 10px ${highlightColor}, 0 0 20px ${highlightColor}`,
                            fontWeight: 900,
                        }}
                    >
                        {text}
                    </span>
                );
            } else {
                // Static highlight
                return (
                    <span
                        key={idx}
                        style={{
                            ...strokeStyle,
                            color: highlightColor,
                            display: 'inline-block',
                            margin: '0 4px',
                            fontWeight: 800,
                        }}
                    >
                        {text}
                    </span>
                );
            }
        }

        // Inactive word in phrase
        return (
            <span
                key={idx}
                style={{
                    ...strokeStyle,
                    color: fontColor,
                    display: 'inline-block',
                    margin: '0 4px',
                    opacity: 0.95,
                    fontWeight: 700,
                }}
            >
                {text}
            </span>
        );
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 animate-fade">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-rule pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="badge-brass text-xs">ESTUDIO PRO</span>
                            <span className="text-xs text-muted">· Desde 10 seg hasta +30 min</span>
                        </div>
                        <h1 className="font-display lowercase text-2xl sm:text-3xl md:text-4xl text-ink mt-1 flex items-center gap-3">
                            <Type className="text-brass" size={28} />
                            Auto Subtítulos & Traducción
                        </h1>
                        <p className="text-xs sm:text-sm text-muted mt-1">
                            Sube cualquier video para subtitularlo con previsualización en vivo, movimiento libre, tipografías virales, colores personalizables y desaparición automática al terminar de hablar.
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
                                    Elige el estilo que se aplicará por defecto. Podrás cambiar libremente el color de la caja, tipografías y moverlo en vivo.
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
                                                    style={{ backgroundColor: p.highlight, color: getContrastColor(p.highlight) }}
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

                        {/* Left Column: Interactive Video Player + Direct Download */}
                        <div className="lg:col-span-5 space-y-4">
                            
                            {/* Mode Switcher Tabs */}
                            <div className="flex items-center justify-between bg-paper2 p-1.5 rounded-input border border-rule text-xs">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveViewMode('interactive');
                                        if (rawVideoUrl) setCurrentVideoUrl(rawVideoUrl);
                                    }}
                                    className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                                        activeViewMode === 'interactive' 
                                            ? 'bg-brass text-black shadow-sm font-semibold' 
                                            : 'text-muted hover:text-ink'
                                    }`}
                                >
                                    <Eye size={13} />
                                    <span>Vista Previa en Vivo (Edición)</span>
                                </button>
                                {burnedVideoUrl && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveViewMode('burned');
                                            setCurrentVideoUrl(burnedVideoUrl);
                                        }}
                                        className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                                            activeViewMode === 'burned' 
                                                ? 'bg-brass text-black shadow-sm font-semibold' 
                                                : 'text-muted hover:text-ink'
                                        }`}
                                    >
                                        <Sparkles size={13} />
                                        <span>Video Guardado (MP4)</span>
                                        {isDirty && <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Hay cambios nuevos sin guardar"></span>}
                                    </button>
                                )}
                            </div>

                            {/* Warning if looking at older burned video while having unsaved edits */}
                            {activeViewMode === 'burned' && isDirty && (
                                <div className="p-2 px-3 rounded-input bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2 animate-fade">
                                    <span>⚠️ Viendo guardado anterior. Tienes cambios en el editor.</span>
                                    <button
                                        type="button"
                                        onClick={handleSaveAndDownload}
                                        disabled={isApplying}
                                        className="text-brass font-bold hover:underline cursor-pointer shrink-0"
                                    >
                                        Guardar y Actualizar
                                    </button>
                                </div>
                            )}

                            {/* Player Container with Interactive Subtitle Overlay */}
                            <div 
                                ref={videoContainerRef}
                                onMouseMove={handleContainerMouseMove}
                                onTouchMove={handleContainerTouchMove}
                                className="card p-2 sm:p-3 bg-black rounded-card border border-rule overflow-hidden relative flex flex-col items-center select-none"
                            >
                                <video
                                    ref={videoRef}
                                    src={currentVideoUrl}
                                    controls
                                    playsInline
                                    onTimeUpdate={handleTimeUpdate}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    onEnded={() => {
                                        setIsPlaying(false);
                                        setCurrentTimeMs(0);
                                    }}
                                    className="w-full max-h-[560px] object-contain rounded-input block mx-auto"
                                />

                                {/* Visual Margin Guides (visible when adjusting side margin) */}
                                {showMarginGuides && activeViewMode === 'interactive' && (
                                    <div 
                                        className="absolute top-0 bottom-0 pointer-events-none border-x-2 border-dashed border-brass/50 transition-all duration-150 z-10"
                                        style={{
                                            left: `${(100 - sideMarginWidth) / 2}%`,
                                            right: `${(100 - sideMarginWidth) / 2}%`,
                                        }}
                                    >
                                        <div className="absolute top-3 left-2 bg-black/80 text-brass text-[10px] px-2 py-0.5 rounded font-mono border border-brass/30">
                                            Margen Seguro ({sideMarginWidth}%)
                                        </div>
                                    </div>
                                )}

                                {/* Real-Time Drag & Drop Subtitle Overlay - STRICTLY DISAPPEARS WHEN SPEECH ENDS */}
                                {activeViewMode === 'interactive' && activeBlockData && (
                                    <div
                                        onMouseDown={handleSubtitleMouseDown}
                                        onTouchStart={handleSubtitleTouchStart}
                                        style={{
                                            position: 'absolute',
                                            top: `${yOffset * 100}%`,
                                            left: `${xOffset * 100}%`,
                                            transform: 'translate(-50%, -50%)',
                                            maxWidth: `${sideMarginWidth}%`,
                                            width: 'max-content',
                                            cursor: isDragging ? 'grabbing' : 'grab',
                                            zIndex: 25,
                                            userSelect: 'none',
                                            pointerEvents: 'auto',
                                        }}
                                        className={`transition-shadow p-1.5 rounded-lg group ${
                                            isDragging 
                                                ? 'ring-2 ring-brass shadow-2xl scale-105' 
                                                : 'hover:ring-1 hover:ring-brass/60'
                                        }`}
                                        title="Haz clic y arrastra para posicionar los subtítulos libremente"
                                    >
                                        {/* Drag Handle Tooltip */}
                                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 text-brass text-[10px] px-2 py-0.5 rounded font-sans tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 shadow-md border border-brass/30">
                                            <Move size={10} />
                                            <span>Arrastra para mover subtítulos (Y: {Math.round(yOffset * 100)}% X: {Math.round(xOffset * 100)}%)</span>
                                        </div>

                                        {/* Subtitle Content with Strict Single-Line Styling */}
                                        <div 
                                            style={{
                                                fontFamily: fontName,
                                                fontSize: `${previewFontSize}px`,
                                                textTransform: uppercase ? 'uppercase' : 'none',
                                                whiteSpace: singleLine ? 'nowrap' : 'normal',
                                                backgroundColor: coverBox ? 'rgba(0,0,0,0.94)' : 'transparent',
                                                padding: coverBox ? '6px 14px' : '2px 6px',
                                                borderRadius: '8px',
                                                lineHeight: 1.25,
                                                textAlign: 'center',
                                                letterSpacing: fontName === 'Anton' || fontName === 'Bebas Neue' ? '1px' : 'normal',
                                            }}
                                            className="font-bold drop-shadow-md select-none leading-tight"
                                        >
                                            {activeBlockData.words.map((w, idx) => {
                                                const isActive = isPlaying 
                                                    ? (currentTimeMs >= w.startMs && currentTimeMs <= w.endMs)
                                                    : (idx === 0); // Highlight first word when paused so user sees the box color clearly
                                                return renderWord(w, isActive, idx);
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Video Info Footer */}
                                <div className="w-full flex items-center justify-between gap-2 mt-2 pt-2 border-t border-rule text-xs text-muted">
                                    <span>Duración: {Math.round(jobData.duration)}s</span>
                                    {jobData.width && jobData.height && (
                                        <span>{jobData.width}×{jobData.height}</span>
                                    )}
                                    <span className="text-brass">Idioma: {jobData.language?.toUpperCase() || 'ES'}</span>
                                </div>
                            </div>

                            {/* Guardar y Descargar Card */}
                            <div className="card p-4 sm:p-5 space-y-4 border border-brass/50 bg-paper2 shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-brass animate-pulse"></span>
                                        <span className="text-xs font-bold text-ink uppercase tracking-wider">
                                            GUARDAR Y DESCARGAR VIDEO
                                        </span>
                                    </div>
                                    {applySuccess && (
                                        <span className="text-xs text-ok font-semibold flex items-center gap-1 animate-fade">
                                            <Check size={14} /> ¡Descargando video!
                                        </span>
                                    )}
                                </div>

                                {/* Status banner */}
                                {isDirty ? (
                                    <div className="p-2.5 rounded-input bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                                        <span>⚠️ Tienes cambios listos. Haz clic en el botón naranja para quemar tu nuevo diseño y descargar.</span>
                                    </div>
                                ) : burnedVideoUrl ? (
                                    <div className="p-2.5 rounded-input bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                                        <span>✅ Tu video está guardado con el diseño exacto que ves en pantalla.</span>
                                    </div>
                                ) : null}

                                <p className="text-xs text-muted leading-relaxed">
                                    Guarda tu personalización (fuente, colores, caja de resalte, posición y texto) y descarga directamente el archivo <strong>MP4</strong> a tu computadora.
                                </p>

                                <button
                                    onClick={handleSaveAndDownload}
                                    disabled={isApplying}
                                    className="w-full btn-primary py-3.5 px-4 rounded-input text-sm sm:text-base font-bold flex items-center justify-center gap-2.5 shadow-xl shadow-brass/25 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
                                >
                                    {isApplying ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin text-black" />
                                            <span className="text-black">Guardando cambios y procesando MP4 con FFmpeg...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download size={20} className="text-black stroke-[2.5]" />
                                            <span className="text-black">💾 Guardar y Descargar Video (MP4)</span>
                                        </>
                                    )}
                                </button>

                                {burnedVideoUrl && !isApplying && (
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveViewMode('burned');
                                                if (videoRef.current) {
                                                    videoRef.current.currentTime = 0;
                                                    videoRef.current.play();
                                                }
                                            }}
                                            className="py-2 px-3 rounded-input bg-paper3 hover:bg-paper2 text-ink2 hover:text-ink text-xs font-medium border border-rule transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <Play size={13} className="text-brass" />
                                            <span>Ver en pantalla</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => triggerFileDownload(burnedVideoUrl)}
                                            className="py-2 px-3 rounded-input bg-paper3 hover:bg-paper2 text-ink2 hover:text-ink text-xs font-medium border border-rule transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                            title="Descarga el video MP4 que ya fue guardado"
                                        >
                                            <Download size={13} className="text-brass" />
                                            <span>Descargar MP4</span>
                                        </button>
                                    </div>
                                )}

                                <p className="text-center text-[11px] text-muted leading-relaxed">
                                    💡 El texto desaparece automáticamente cuando la persona deja de hablar. Al guardar, el video se genera en alta calidad con el diseño que ves en pantalla.
                                </p>
                            </div>

                        </div>

                        {/* Right Column: Customization Controls & 1-Click Translation */}
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
                                            <span>{translateSuccess ? '¡Subtítulos Traducidos en Vivo! ✓' : 'Traducir Subtítulos a Español ✨'}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Controls: Fonts & Styles */}
                            <div className="card p-5 space-y-5">
                                <div className="flex items-center justify-between border-b border-rule pb-3">
                                    <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                                        <Palette size={16} className="text-brass" /> Tipografía y Estilo (Previsualización Instantánea)
                                    </h3>
                                    {applySuccess && (
                                        <span className="text-xs text-ok font-medium animate-fade">¡Video exportado con éxito! ✓</span>
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

                                {/* Instant Font Selector Cards */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="eyebrow">FUENTE VIRAL (CAMBIO INMEDIATO AL CLIC)</label>
                                        <span className="text-[11px] text-muted">Haz clic para previsualizar en el video</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {FONT_OPTIONS.map((f) => {
                                            const active = fontName === f.value;
                                            return (
                                                <button
                                                    key={f.value}
                                                    type="button"
                                                    onClick={() => setFontName(f.value)}
                                                    className={`p-2.5 rounded-input border text-left transition-all flex flex-col justify-between ${
                                                        active 
                                                            ? 'border-brass bg-brass/10 ring-1 ring-brass' 
                                                            : 'border-rule bg-paper3 hover:border-rule2'
                                                    }`}
                                                >
                                                    <span 
                                                        style={{ fontFamily: f.value }}
                                                        className={`text-sm truncate block ${active ? 'text-brass font-bold' : 'text-ink'}`}
                                                    >
                                                        {f.label}
                                                    </span>
                                                    <span className="text-[10px] text-muted truncate mt-1">
                                                        {f.category}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Animation Effect & Box Style Selector */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="eyebrow block mb-1.5">EFECTO DE ANIMACIÓN</label>
                                        <select
                                            value={effect}
                                            onChange={(e) => setEffect(e.target.value)}
                                            className="input-field text-xs py-2 font-medium"
                                        >
                                            <option value="highlight">Highlight Pill (Caja enmarcando palabra activa)</option>
                                            <option value="pop">Pop (Palabra crece en color de resalte)</option>
                                            <option value="glow">Glow (Resplandor neón)</option>
                                            <option value="none">Estático (Sin animación)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="eyebrow">TAMAÑO DE FUENTE</label>
                                            <span className="text-xs font-mono text-muted">{fontSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="24"
                                            max="72"
                                            value={fontSize}
                                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                                            className="w-full accent-brass cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* CUSTOM COLOR OF THE HIGHLIGHT BOX / ACTIVE WORD (Requested by user) */}
                                <div className="p-4 rounded-card bg-paper3 border border-rule space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="eyebrow flex items-center gap-2">
                                            <Palette size={14} className="text-brass" />
                                            <span>
                                                {effect === 'highlight' 
                                                    ? 'COLOR DE LA CAJA QUE ENMARCA LA PALABRA (PILL)' 
                                                    : 'COLOR DE RESALTE DE PALABRA ACTIVA'}
                                            </span>
                                        </label>
                                        <div 
                                            className="text-xs px-2.5 py-0.5 rounded font-bold shadow-sm"
                                            style={{ 
                                                backgroundColor: highlightColor, 
                                                color: getContrastColor(highlightColor) 
                                            }}
                                        >
                                            VISTA PREVIA
                                        </div>
                                    </div>

                                    <p className="text-[11px] text-muted">
                                        {effect === 'highlight'
                                            ? 'Elige el color de la caja que encierra la palabra activa (ej. Verde Lima, Púrpura, Amarillo, Rojo, etc.):'
                                            : 'Elige el color con el que resalta la palabra que se está pronunciando:'}
                                    </p>

                                    {/* 1-Click Color Chips for Box / Highlight */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {HIGHLIGHT_COLOR_PRESETS.map((c) => {
                                            const isSelected = highlightColor.toLowerCase() === c.hex.toLowerCase();
                                            return (
                                                <button
                                                    key={c.hex}
                                                    type="button"
                                                    title={c.name}
                                                    onClick={() => setHighlightColor(c.hex)}
                                                    className={`w-8 h-8 rounded-full border-2 transition-transform flex items-center justify-center shrink-0 shadow-sm ${
                                                        isSelected 
                                                            ? 'scale-115 border-white ring-2 ring-brass shadow-md' 
                                                            : 'border-transparent hover:scale-105 opacity-90 hover:opacity-100'
                                                    }`}
                                                    style={{ backgroundColor: c.hex }}
                                                >
                                                    {isSelected && (
                                                        <Check 
                                                            size={15} 
                                                            style={{ color: getContrastColor(c.hex) }} 
                                                            className="stroke-[3]" 
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}

                                        {/* Custom Color Picker input */}
                                        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-rule">
                                            <input
                                                type="color"
                                                value={highlightColor}
                                                onChange={(e) => setHighlightColor(e.target.value)}
                                                className="w-8 h-8 rounded-full border border-rule cursor-pointer"
                                                title="Seleccionar color personalizado"
                                            />
                                            <input
                                                type="text"
                                                value={highlightColor}
                                                onChange={(e) => setHighlightColor(e.target.value)}
                                                className="input-field font-mono text-xs uppercase w-20 py-1"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* BASE TEXT COLOR */}
                                <div>
                                    <label className="eyebrow block mb-1.5">COLOR DEL TEXTO BASE (RESTO DE PALABRAS)</label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {BASE_COLOR_PRESETS.map((c) => {
                                            const isSelected = fontColor.toLowerCase() === c.hex.toLowerCase();
                                            return (
                                                <button
                                                    key={c.hex}
                                                    type="button"
                                                    title={c.name}
                                                    onClick={() => setFontColor(c.hex)}
                                                    className={`w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center shrink-0 ${
                                                        isSelected 
                                                            ? 'scale-115 border-white ring-2 ring-brass' 
                                                            : 'border-rule hover:scale-105 opacity-85 hover:opacity-100'
                                                    }`}
                                                    style={{ backgroundColor: c.hex }}
                                                >
                                                    {isSelected && (
                                                        <Check 
                                                            size={13} 
                                                            style={{ color: getContrastColor(c.hex) }} 
                                                            className="stroke-[3]" 
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}

                                        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-rule">
                                            <input
                                                type="color"
                                                value={fontColor}
                                                onChange={(e) => setFontColor(e.target.value)}
                                                className="w-7 h-7 rounded-full border border-rule cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={fontColor}
                                                onChange={(e) => setFontColor(e.target.value)}
                                                className="input-field font-mono text-xs uppercase w-20 py-1"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Free Drag & Positioning Section */}
                                <div className="p-4 rounded-card bg-paper3 border border-rule space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Move size={16} className="text-brass" />
                                            <span className="text-xs font-semibold text-ink uppercase tracking-wide">POSICIONAMIENTO LIBRE & MOVIMIENTO</span>
                                        </div>
                                        <span className="text-[11px] text-muted">Arrastra en el video o usa botones</span>
                                    </div>

                                    {/* Quick Position Buttons */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setYOffset(0.18)}
                                            className={`py-1.5 px-2 rounded-input border text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                                                yOffset === 0.18 ? 'border-brass bg-brass text-black font-semibold' : 'border-rule hover:border-rule2'
                                            }`}
                                        >
                                            <ArrowUp size={13} /> Arriba (18%)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setYOffset(0.50)}
                                            className={`py-1.5 px-2 rounded-input border text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                                                yOffset === 0.50 ? 'border-brass bg-brass text-black font-semibold' : 'border-rule hover:border-rule2'
                                            }`}
                                        >
                                            <LayoutTemplate size={13} /> Centro (50%)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setYOffset(0.80)}
                                            className={`py-1.5 px-2 rounded-input border text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                                                yOffset === 0.80 ? 'border-brass bg-brass text-black font-semibold' : 'border-rule hover:border-rule2'
                                            }`}
                                        >
                                            <ArrowDown size={13} /> Abajo (80%)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setXOffset(0.50)}
                                            className={`py-1.5 px-2 rounded-input border text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                                                xOffset === 0.50 ? 'border-brass bg-brass text-black font-semibold' : 'border-rule hover:border-rule2'
                                            }`}
                                        >
                                            <AlignCenter size={13} /> Centrar X (50%)
                                        </button>
                                    </div>

                                    {/* Precision Sliders */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[11px] text-muted font-medium">ALTURA VERTICAL (Y)</label>
                                                <span className="text-xs font-mono text-brass">{Math.round(yOffset * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.08"
                                                max="0.92"
                                                step="0.01"
                                                value={yOffset}
                                                onChange={(e) => setYOffset(parseFloat(e.target.value))}
                                                className="w-full accent-brass cursor-pointer"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[11px] text-muted font-medium">POSICIÓN HORIZONTAL (X)</label>
                                                <span className="text-xs font-mono text-brass">{Math.round(xOffset * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.15"
                                                max="0.85"
                                                step="0.01"
                                                value={xOffset}
                                                onChange={(e) => setXOffset(parseFloat(e.target.value))}
                                                className="w-full accent-brass cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Side Margin & Single Line Mode (User Solution) */}
                                <div className="p-4 rounded-card bg-paper3 border border-rule space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sliders size={16} className="text-brass" />
                                            <span className="text-xs font-semibold text-ink uppercase tracking-wide">MÁRGENES & MODO 1 SOLA LÍNEA (ANTI-DESBORDE)</span>
                                        </div>
                                        <span className="badge-brass text-[10px]">ANTI-DESBORDE</span>
                                    </div>

                                    {/* Toggle Single Line Mode */}
                                    <label className="flex items-start gap-3 cursor-pointer select-none p-2.5 rounded-input bg-paper2 border border-rule hover:border-brass/50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={singleLine}
                                            onChange={(e) => setSingleLine(e.target.checked)}
                                            className="w-4 h-4 accent-brass mt-0.5 shrink-0"
                                        />
                                        <div>
                                            <span className="text-xs font-semibold text-ink block">
                                                Modo 1 Sola Línea (Evita que el texto salte hacia arriba)
                                            </span>
                                            <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                                                Divide el texto en frases cortas de 2-3 palabras exactas en una sola línea horizontal. Bloquea que los subtítulos se dividan en dos pisos o salten para arriba.
                                            </p>
                                        </div>
                                    </label>

                                    {/* Side Margin Slider */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[11px] text-muted font-medium">
                                                ANCHO MÁXIMO DEL TEXTO / MARGEN LATERAL
                                            </label>
                                            <span className="text-xs font-mono text-brass">
                                                {sideMarginWidth}% (Margen: {Math.round((100 - sideMarginWidth) / 2)}% por lado)
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="55"
                                            max="95"
                                            step="1"
                                            value={sideMarginWidth}
                                            onMouseEnter={() => setShowMarginGuides(true)}
                                            onMouseLeave={() => setShowMarginGuides(false)}
                                            onTouchStart={() => setShowMarginGuides(true)}
                                            onTouchEnd={() => setShowMarginGuides(false)}
                                            onChange={(e) => setSideMarginWidth(parseInt(e.target.value))}
                                            className="w-full accent-brass cursor-pointer"
                                        />
                                        <p className="text-[11px] text-muted mt-1">
                                            Controla el ancho seguro de la pantalla donde se escriben los subtítulos.
                                        </p>
                                    </div>
                                </div>

                                {/* Border & Toggles */}
                                <div className="space-y-3 pt-2 border-t border-rule">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="eyebrow">GROSOR DE BORDE NEGRO</label>
                                            <span className="text-xs font-mono text-muted">{borderWidth}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="8"
                                            value={borderWidth}
                                            onChange={(e) => setBorderWidth(parseInt(e.target.value))}
                                            className="w-full accent-brass cursor-pointer"
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-5 text-xs text-ink2 pt-2">
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

                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={forcePreviewWhenPaused}
                                                onChange={(e) => setForcePreviewWhenPaused(e.target.checked)}
                                                className="w-4 h-4 accent-brass"
                                            />
                                            <span>Mostrar texto de muestra al pausar</span>
                                        </label>
                                    </div>
                                </div>

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
                                            Al modificar el texto, se actualiza automáticamente en la vista previa del video.
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
