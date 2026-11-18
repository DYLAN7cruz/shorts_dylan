import React, { useState, useEffect } from 'react';
import { FolderKanban, Trash2, Play, ExternalLink, HardDrive, Film, Clock, Loader2, AlertTriangle } from 'lucide-react';
import Modal from './ui/Modal';
import { apiFetch, getApiUrl } from '../lib/api';

export default function ProjectsModal({ isOpen, onClose, onProjectLoaded }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingJobId, setLoadingJobId] = useState(null);
    const [deletingJobId, setDeletingJobId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [error, setError] = useState(null);

    const fetchProjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch('/api/local/projects');
            if (!res.ok) throw new Error('Error al cargar la lista de proyectos');
            const data = await res.json();
            setProjects(data.projects || []);
        } catch (e) {
            setError(e?.message || 'Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchProjects();
            setConfirmDeleteId(null);
        }
    }, [isOpen]);

    const handleLoad = async (jobId) => {
        setLoadingJobId(jobId);
        setError(null);
        try {
            const res = await apiFetch(`/api/local/projects/${jobId}/load`, {
                method: 'POST'
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Error al cargar el proyecto');
            }
            const data = await res.json();
            if (onProjectLoaded) {
                onProjectLoaded(data);
            }
            onClose();
        } catch (e) {
            setError(e?.message || 'Error al abrir el proyecto');
        } finally {
            setLoadingJobId(null);
        }
    };

    const handleDelete = async (jobId) => {
        setDeletingJobId(jobId);
        setError(null);
        try {
            const res = await apiFetch(`/api/local/projects/${jobId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Error al eliminar el proyecto');
            setProjects(prev => prev.filter(p => p.job_id !== jobId));
            setConfirmDeleteId(null);
        } catch (e) {
            setError(e?.message || 'Error al eliminar el proyecto del disco');
        } finally {
            setDeletingJobId(null);
        }
    };

    const totalSpace = projects.reduce((acc, p) => acc + (p.size_mb || 0), 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            eyebrow="PROYECTOS & HISTORIAL"
            title="Mis Clips Guardados"
            footer={
                <div className="flex justify-between items-center w-full">
                    <div className="text-xs text-muted flex items-center gap-2">
                        <HardDrive size={13} className="text-brass" />
                        <span>Espacio ocupado en disco: <strong className="text-ink">{totalSpace.toFixed(1)} MB</strong></span>
                    </div>
                    <button onClick={onClose} className="btn-quiet py-2 px-4 text-xs">
                        Cerrar
                    </button>
                </div>
            }
        >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <p className="text-xs text-muted leading-relaxed">
                    Aquí están todos los videos procesados guardados localmente. Puedes abrir cualquiera para seguir editando o eliminar los que ya no uses para liberar espacio en tu disco duro.
                </p>

                {error && (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-input text-xs text-red-300">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-muted gap-2">
                        <Loader2 size={24} className="animate-spin text-brass" />
                        <span className="text-xs">Cargando proyectos guardados…</span>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="py-12 text-center text-muted border border-dashed border-rule rounded-input p-6">
                        <Film size={32} className="mx-auto mb-2 opacity-40 text-muted" />
                        <h4 className="text-xs font-semibold text-ink mb-1">No hay proyectos guardados todavía</h4>
                        <p className="text-[11px]">Procesa un video de YouTube o un archivo MP4 y se guardará automáticamente aquí.</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {projects.map((proj) => {
                            const isConfirming = confirmDeleteId === proj.job_id;
                            const isDeleting = deletingJobId === proj.job_id;
                            const isLoadingThis = loadingJobId === proj.job_id;

                            return (
                                <div
                                    key={proj.job_id}
                                    className="p-3 rounded-input border border-rule hover:border-rule2 bg-paper2/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        {proj.preview_url ? (
                                            <div className="w-16 h-20 rounded bg-paper3 overflow-hidden shrink-0 border border-rule relative">
                                                <video
                                                    src={getApiUrl(proj.preview_url)}
                                                    className="w-full h-full object-cover"
                                                    muted
                                                    preload="metadata"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-20 rounded bg-paper3 border border-rule flex items-center justify-center shrink-0 text-muted">
                                                <Film size={20} />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-semibold text-ink truncate mb-1" title={proj.title}>
                                                {proj.title}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} />
                                                    {proj.formatted_date}
                                                </span>
                                                <span className="flex items-center gap-1 text-brass font-medium">
                                                    <Film size={11} />
                                                    {proj.clip_count} {proj.clip_count === 1 ? 'clip' : 'clips'}
                                                </span>
                                                <span className="flex items-center gap-1 font-mono">
                                                    <HardDrive size={11} />
                                                    {proj.size_mb} MB
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botones de acción */}
                                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                        {isConfirming ? (
                                            <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-500/50 p-1 rounded-input text-xs">
                                                <span className="text-[11px] text-red-300 px-1 font-medium">¿Seguro?</span>
                                                <button
                                                    onClick={() => handleDelete(proj.job_id)}
                                                    disabled={isDeleting}
                                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-semibold"
                                                >
                                                    {isDeleting ? <Loader2 size={11} className="animate-spin" /> : 'Sí, borrar'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="px-2 py-1 bg-paper3 hover:bg-paper2 text-ink rounded text-[11px]"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleLoad(proj.job_id)}
                                                    disabled={isLoadingThis || isDeleting}
                                                    className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                                                    title="Abrir y continuar editando este proyecto"
                                                >
                                                    {isLoadingThis ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                                    {isLoadingThis ? 'Abriendo…' : 'Abrir clips'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(proj.job_id)}
                                                    disabled={isDeleting || isLoadingThis}
                                                    className="p-2 text-muted hover:text-red-400 border border-rule hover:border-red-500/40 rounded-button bg-paper3/50 transition-all"
                                                    title="Eliminar este proyecto y liberar espacio en disco"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
