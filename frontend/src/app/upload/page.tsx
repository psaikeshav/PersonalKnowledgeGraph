'use client';

import { useState, useCallback, useEffect } from 'react';

// Pipeline stages
const PIPELINE_STAGES = [
    { id: 'upload', label: 'Upload', icon: 'upload' },
    { id: 'extract', label: 'Text Extraction', icon: 'file-text' },
    { id: 'chunk', label: 'Chunking', icon: 'layers' },
    { id: 'entity', label: 'Entity Extraction', icon: 'cpu' },
    { id: 'graph', label: 'Graph Creation', icon: 'share-2' },
];

type PipelineStatus = 'pending' | 'active' | 'complete' | 'error';

interface ProcessingState {
    docId: string | null;
    stage: string;
    progress: number;
    message: string;
    details: Record<string, any>;
}

export default function UploadPage() {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Handle file selection
    const handleFileSelect = useCallback((file: File) => {
        const allowedExtensions = ['.pdf', '.docx', '.txt'];
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!allowedExtensions.includes(extension)) {
            setError('Please upload a PDF, DOCX, or TXT file.');
            return;
        }

        setSelectedFile(file);
        setError(null);
    }, []);

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    // Poll for processing status
    const pollStatus = async (docId: string) => {
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes max

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(`/api/upload/status/${docId}`);
                if (!response.ok) {
                    throw new Error('Failed to get status');
                }

                const status = await response.json();

                // Map backend stages to frontend
                const stageMap: Record<string, { stage: string; progress: number; message: string }> = {
                    'uploaded': { stage: 'upload', progress: 20, message: 'Document uploaded...' },
                    'extracting': { stage: 'extract', progress: 35, message: 'Extracting text from document...' },
                    'chunking': { stage: 'chunk', progress: 50, message: 'Splitting text into chunks...' },
                    'embedding': { stage: 'entity', progress: 65, message: 'Generating embeddings...' },
                    'extracting_entities': { stage: 'entity', progress: 75, message: 'Extracting entities with LLM...' },
                    'building_graph': { stage: 'graph', progress: 85, message: 'Building knowledge graph...' },
                    'complete': { stage: 'complete', progress: 100, message: 'Processing complete!' },
                    'error': { stage: 'error', progress: 0, message: status.error || 'Processing failed' }
                };

                const currentStage = stageMap[status.stage] || {
                    stage: status.stage,
                    progress: 50,
                    message: `Processing: ${status.stage}`
                };

                setProcessingState({
                    docId,
                    stage: currentStage.stage,
                    progress: currentStage.progress,
                    message: currentStage.message,
                    details: status.details || {},
                });

                if (status.stage === 'complete') {
                    setIsProcessing(false);
                    return;
                }

                if (status.stage === 'error') {
                    setError(status.error || 'Processing failed');
                    setIsProcessing(false);
                    return;
                }

            } catch (err) {
                console.error('Status poll error:', err);
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        setError('Processing timeout');
        setIsProcessing(false);
    };

    // Upload and process file
    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setError(null);
        setProcessingState({
            docId: null,
            stage: 'upload',
            progress: 10,
            message: 'Uploading document...',
            details: {},
        });

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            // Upload file
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Upload failed');
            }

            const result = await response.json();
            const docId = result.doc_id;

            setProcessingState({
                docId,
                stage: 'upload',
                progress: 20,
                message: 'Document uploaded, starting processing...',
                details: result,
            });

            // Start polling for status
            await pollStatus(docId);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
            setIsProcessing(false);
            setProcessingState(null);
        }
    };

    // Clear all data
    const handleClearAll = async () => {
        if (!window.confirm('Are you sure? This will delete ALL documents and graph data.')) {
            return;
        }

        try {
            const response = await fetch('/api/admin/clear', { method: 'DELETE' });
            if (response.ok) {
                alert('All data cleared successfully');
                setSelectedFile(null);
                setProcessingState(null);
            } else {
                const err = await response.json();
                alert('Failed to clear data: ' + err.detail);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to clear data');
        }
    };

    // Get stage status
    const getStageStatus = (stageId: string): PipelineStatus => {
        if (!processingState) return 'pending';

        const stageOrder = ['upload', 'extract', 'chunk', 'entity', 'graph'];
        const currentIndex = stageOrder.indexOf(processingState.stage);
        const stageIndex = stageOrder.indexOf(stageId);

        if (processingState.stage === 'error') return stageIndex <= currentIndex ? 'error' : 'pending';
        if (processingState.stage === 'complete') return 'complete';
        if (stageIndex < currentIndex) return 'complete';
        if (stageIndex === currentIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="page">
            <div className="container">
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: 'var(--spacing-md)' }}>
                        <h1 style={{ margin: 0 }}>Upload Documents</h1>
                        <button
                            onClick={handleClearAll}
                            className="btn"
                            style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: 'var(--color-error)',
                                border: '1px solid var(--color-error)',
                                padding: '0.25rem 0.75rem',
                                fontSize: '0.8rem'
                            }}
                        >
                            Clear All Data
                        </button>
                    </div>
                    <p style={{ color: 'var(--color-gray-400)', maxWidth: '600px', margin: '0 auto' }}>
                        Upload your documents to extract knowledge and build your personal knowledge graph.
                        Supported formats: PDF, DOCX, TXT
                    </p>
                </div>

                {/* Upload Zone */}
                <div style={{ maxWidth: '700px', margin: '0 auto var(--spacing-2xl)' }}>
                    <div
                        className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-input')?.click()}
                    >
                        <input
                            id="file-input"
                            type="file"
                            accept=".pdf,.docx,.txt"
                            onChange={handleInputChange}
                            style={{ display: 'none' }}
                        />

                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>

                        <h3 style={{ color: 'var(--color-gray-300)', marginBottom: 'var(--spacing-sm)' }}>
                            {selectedFile ? selectedFile.name : 'Drag & drop your file here'}
                        </h3>
                        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
                            or click to browse
                        </p>

                        {selectedFile && (
                            <div style={{ marginTop: 'var(--spacing-md)' }}>
                                <span className="badge badge-info">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            marginTop: 'var(--spacing-md)',
                            padding: 'var(--spacing-md)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid var(--color-error)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-error)'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Upload Button */}
                    {selectedFile && !isProcessing && processingState?.stage !== 'complete' && (
                        <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
                            <button className="btn btn-primary btn-lg" onClick={handleUpload}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                Start Processing
                            </button>
                        </div>
                    )}
                </div>

                {/* Pipeline Progress */}
                {(isProcessing || processingState) && (
                    <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <h3 style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
                            Processing Pipeline
                        </h3>

                        <div className="pipeline">
                            {PIPELINE_STAGES.map((stage, index) => (
                                <div key={stage.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <div className={`pipeline-step ${getStageStatus(stage.id)}`}>
                                        <div className="pipeline-icon">
                                            <PipelineIcon name={stage.icon} status={getStageStatus(stage.id)} />
                                        </div>
                                        <span style={{
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                            color: getStageStatus(stage.id) === 'complete' ? 'var(--color-success)' :
                                                getStageStatus(stage.id) === 'active' ? 'var(--color-primary-400)' :
                                                    getStageStatus(stage.id) === 'error' ? 'var(--color-error)' :
                                                        'var(--color-gray-500)'
                                        }}>
                                            {stage.label}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Progress Info */}
                        {processingState && (
                            <div style={{
                                textAlign: 'center',
                                marginTop: 'var(--spacing-xl)',
                                padding: 'var(--spacing-lg)',
                                background: 'var(--color-gray-900)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{
                                    height: '8px',
                                    background: 'var(--color-gray-800)',
                                    borderRadius: 'var(--radius-full)',
                                    overflow: 'hidden',
                                    marginBottom: 'var(--spacing-md)'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${processingState.progress}%`,
                                        background: processingState.stage === 'error'
                                            ? 'var(--color-error)'
                                            : 'linear-gradient(90deg, var(--color-primary-600), var(--color-primary-400))',
                                        borderRadius: 'var(--radius-full)',
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>

                                <p style={{ color: 'var(--color-gray-300)', marginBottom: 'var(--spacing-sm)' }}>
                                    {processingState.message}
                                </p>
                                <span style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
                                    {processingState.progress}% complete
                                </span>
                            </div>
                        )}

                        {/* Completion Actions */}
                        {processingState?.stage === 'complete' && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: 'var(--spacing-md)',
                                marginTop: 'var(--spacing-xl)'
                            }}>
                                <a href="/graph" className="btn btn-primary">
                                    View Knowledge Graph
                                </a>
                                <a href="/query" className="btn btn-secondary">
                                    Ask Questions
                                </a>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setProcessingState(null);
                                    }}
                                >
                                    Upload Another
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Info Cards */}
                {!processingState && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 'var(--spacing-lg)',
                        marginTop: 'var(--spacing-2xl)'
                    }}>
                        <InfoCard
                            title="Text Extraction"
                            description="Text is extracted from your documents using specialized parsers for each format."
                            icon="file-text"
                        />
                        <InfoCard
                            title="Smart Chunking"
                            description="Documents are split into overlapping chunks at natural boundaries for better context."
                            icon="layers"
                        />
                        <InfoCard
                            title="Entity Extraction"
                            description="LLMs identify entities (people, organizations, concepts) and their relationships."
                            icon="cpu"
                        />
                        <InfoCard
                            title="Graph Construction"
                            description="Entities and relationships are stored in Neo4j, creating your knowledge graph."
                            icon="share-2"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// Pipeline Icon Component
function PipelineIcon({ name, status }: { name: string; status: PipelineStatus }) {
    const color = status === 'complete' ? 'white' :
        status === 'active' ? 'white' :
            status === 'error' ? 'var(--color-error)' :
                'var(--color-gray-500)';

    const icons: Record<string, JSX.Element> = {
        'upload': (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
        ),
        'file-text': (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        ),
        'layers': (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
            </svg>
        ),
        'cpu': (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
            </svg>
        ),
        'share-2': (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
        ),
    };

    return icons[name] || null;
}

// Info Card Component
function InfoCard({ title, description, icon }: { title: string; description: string; icon: string }) {
    return (
        <div className="card">
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <PipelineIcon name={icon} status="pending" />
            </div>
            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>{title}</h4>
            <p style={{ fontSize: '0.9rem' }}>{description}</p>
        </div>
    );
}
