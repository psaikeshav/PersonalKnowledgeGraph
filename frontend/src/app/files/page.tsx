'use client';

import { useState, useEffect, useCallback } from 'react';

interface FileInfo {
    file_id: string;
    filename: string;
    file_type: string;
    upload_date: string;
    entity_count: number;
    status: string;
}

interface MatchedChunk {
    text: string;
    score: number;
}

interface FileMatch {
    file_id: string;
    filename: string;
    file_type: string;
    upload_date: string;
    relevance_score: number;
    matched_entities: string[];
    matched_relationships: string[];
    matched_chunks: MatchedChunk[];
    explanation: string;
}

interface SearchResponse {
    query: string;
    total_matches: number;
    files: FileMatch[];
}

type FileTypeFilter = 'all' | 'pdf' | 'docx' | 'txt';

export default function FilesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<FileMatch[] | null>(null);
    const [allFiles, setAllFiles] = useState<FileInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
    const [expandedFile, setExpandedFile] = useState<string | null>(null);

    // Load all files on mount
    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/files');
            if (!response.ok) {
                throw new Error('Failed to load files');
            }
            const files = await response.json();
            setAllFiles(files);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load files');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults(null);
            return;
        }

        setIsSearching(true);
        setError(null);

        try {
            const response = await fetch('/api/files/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: searchQuery,
                    top_k: 10,
                    file_type: fileTypeFilter === 'all' ? null : fileTypeFilter,
                }),
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data: SearchResponse = await response.json();
            setSearchResults(data.files);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults(null);
    };

    const handleDownload = async (fileId: string, filename: string) => {
        try {
            const response = await fetch(`/api/files/${fileId}/download`);
            if (!response.ok) {
                throw new Error('Download failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Download failed');
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Unknown';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    const getFileIcon = (fileType: string) => {
        switch (fileType.toLowerCase()) {
            case 'pdf':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M9 15h6" />
                        <path d="M9 11h6" />
                    </svg>
                );
            case 'docx':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                );
            case 'txt':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                );
            default:
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                        <polyline points="13 2 13 9 20 9" />
                    </svg>
                );
        }
    };

    const getFileTypeColor = (fileType: string) => {
        switch (fileType.toLowerCase()) {
            case 'pdf':
                return 'var(--color-error)';
            case 'docx':
                return 'var(--color-primary-500)';
            case 'txt':
                return 'var(--color-success)';
            default:
                return 'var(--color-gray-400)';
        }
    };

    // Filter files based on type
    const filteredFiles = allFiles.filter(
        (file) => fileTypeFilter === 'all' || file.file_type === fileTypeFilter
    );

    const displayFiles = searchResults || filteredFiles.map(f => ({
        ...f,
        relevance_score: 0,
        matched_entities: [],
        matched_relationships: [],
        matched_chunks: [],
        explanation: ''
    } as FileMatch));

    return (
        <div className="page">
            <div className="container">
                {/* Header */}
                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="3" />
                            </svg>
                            My Files (AI Search)
                        </span>
                    </h1>
                    <p style={{ color: 'var(--color-gray-400)' }}>
                        Search your uploaded documents using natural language. Powered by GraphRAG + semantic search.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'stretch' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Try: 'Find documents about GraphRAG' or 'Show my notes on machine learning'"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={handleKeyPress}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-md) var(--spacing-lg)',
                                    paddingRight: searchQuery ? '40px' : 'var(--spacing-lg)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-gray-700)',
                                    background: 'var(--color-gray-800)',
                                    color: 'var(--color-gray-100)',
                                    fontSize: '1rem',
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={clearSearch}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-gray-400)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleSearch}
                            disabled={isSearching || !searchQuery.trim()}
                            style={{ minWidth: '120px' }}
                        >
                            {isSearching ? (
                                <span className="loading-spinner" />
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    Search
                                </>
                            )}
                        </button>
                    </div>

                    {/* File Type Filters */}
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                        <span style={{ color: 'var(--color-gray-400)', marginRight: 'var(--spacing-sm)' }}>Filter:</span>
                        {(['all', 'pdf', 'docx', 'txt'] as FileTypeFilter[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFileTypeFilter(type)}
                                style={{
                                    padding: 'var(--spacing-xs) var(--spacing-md)',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    background: fileTypeFilter === type ? 'var(--color-primary-600)' : 'var(--color-gray-700)',
                                    color: fileTypeFilter === type ? 'white' : 'var(--color-gray-300)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {type === 'all' ? 'All Files' : type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="card" style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        borderColor: 'var(--color-error)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <p style={{ color: 'var(--color-error)', margin: 0 }}>{error}</p>
                    </div>
                )}

                {/* Search Results Header */}
                {searchResults && (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: 'var(--spacing-md)' 
                    }}>
                        <p style={{ color: 'var(--color-gray-300)', margin: 0 }}>
                            Found <strong>{searchResults.length}</strong> files matching "{searchQuery}"
                        </p>
                        <button
                            onClick={clearSearch}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-primary-400)',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                            }}
                        >
                            Clear search results
                        </button>
                    </div>
                )}

                {/* Search Loading State */}
                {isSearching && (
                    <div className="card search-loading">
                        <div className="loading-spinner loading-spinner-lg" />
                        <p className="search-loading-text">
                            Searching your documents with AI...
                        </p>
                        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.8rem' }}>
                            Analyzing content, entities, and graph relationships
                        </p>
                    </div>
                )}

                {/* Initial Loading State */}
                {isLoading && !isSearching && (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                        <div className="loading-spinner loading-spinner-lg" style={{ margin: '0 auto var(--spacing-md)' }} />
                        <p style={{ color: 'var(--color-gray-400)' }}>Loading your files...</p>
                    </div>
                )}

                {/* No Files State */}
                {!isLoading && !isSearching && displayFiles.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                        <svg 
                            width="64" 
                            height="64" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="var(--color-gray-600)" 
                            strokeWidth="1.5"
                            style={{ margin: '0 auto var(--spacing-md)' }}
                        >
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <h3 style={{ color: 'var(--color-gray-300)', marginBottom: 'var(--spacing-sm)' }}>
                            {searchResults !== null ? 'No matching files found' : 'No files uploaded yet'}
                        </h3>
                        <p style={{ color: 'var(--color-gray-500)' }}>
                            {searchResults !== null 
                                ? 'Try different search terms or remove filters'
                                : 'Upload some documents to get started'
                            }
                        </p>
                        {searchResults === null && (
                            <a href="/upload" className="btn btn-primary" style={{ marginTop: 'var(--spacing-md)' }}>
                                Upload Documents
                            </a>
                        )}
                    </div>
                )}

                {/* File Cards */}
                {!isSearching && !isLoading && displayFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {displayFiles.map((file) => (
                        <div 
                            key={file.file_id} 
                            className="card"
                            style={{
                                borderLeftWidth: '4px',
                                borderLeftColor: getFileTypeColor(file.file_type),
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', flex: 1 }}>
                                    {/* File Icon */}
                                    <div style={{ 
                                        color: getFileTypeColor(file.file_type),
                                        flexShrink: 0,
                                    }}>
                                        {getFileIcon(file.file_type)}
                                    </div>

                                    {/* File Info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{file.filename}</h3>
                                            <span 
                                                className="badge"
                                                style={{ 
                                                    background: getFileTypeColor(file.file_type),
                                                    color: 'white',
                                                    fontSize: '0.7rem',
                                                    padding: '2px 8px',
                                                }}
                                            >
                                                {file.file_type.toUpperCase()}
                                            </span>
                                            {file.relevance_score > 0 && (
                                                <span 
                                                    className="badge badge-success"
                                                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                                >
                                                    {Math.min(100, Math.round(file.relevance_score * 100))}% match
                                                </span>
                                            )}
                                        </div>
                                        
                                        <p style={{ 
                                            color: 'var(--color-gray-400)', 
                                            fontSize: '0.875rem',
                                            margin: '0 0 var(--spacing-sm) 0',
                                        }}>
                                            Uploaded: {formatDate(file.upload_date)}
                                        </p>

                                        {/* Match Explanation (for search results) */}
                                        {file.explanation && (
                                            <div style={{
                                                background: 'var(--color-gray-800)',
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                borderRadius: 'var(--radius-sm)',
                                                marginBottom: 'var(--spacing-sm)',
                                            }}>
                                                <p style={{ 
                                                    margin: 0, 
                                                    fontSize: '0.875rem',
                                                    color: 'var(--color-primary-400)',
                                                }}>
                                                    <strong>Why this file:</strong> {file.explanation}
                                                </p>
                                            </div>
                                        )}

                                        {/* Matched Entities */}
                                        {file.matched_entities && file.matched_entities.length > 0 && (
                                            <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                                <span style={{ color: 'var(--color-gray-400)', fontSize: '0.75rem' }}>
                                                    Matched Entities:
                                                </span>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                                    {file.matched_entities.slice(0, 5).map((entity, i) => (
                                                        <span 
                                                            key={i}
                                                            style={{
                                                                background: 'var(--color-gray-700)',
                                                                color: 'var(--color-gray-200)',
                                                                padding: '2px 8px',
                                                                borderRadius: 'var(--radius-sm)',
                                                                fontSize: '0.75rem',
                                                            }}
                                                        >
                                                            {entity}
                                                        </span>
                                                    ))}
                                                    {file.matched_entities.length > 5 && (
                                                        <span style={{ 
                                                            color: 'var(--color-gray-500)', 
                                                            fontSize: '0.75rem',
                                                            padding: '2px 4px',
                                                        }}>
                                                            +{file.matched_entities.length - 5} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Expandable chunk previews */}
                                        {file.matched_chunks && file.matched_chunks.length > 0 && (
                                            <div>
                                                <button
                                                    onClick={() => setExpandedFile(
                                                        expandedFile === file.file_id ? null : file.file_id
                                                    )}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--color-primary-400)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem',
                                                        padding: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                    }}
                                                >
                                                    <svg 
                                                        width="14" 
                                                        height="14" 
                                                        viewBox="0 0 24 24" 
                                                        fill="none" 
                                                        stroke="currentColor" 
                                                        strokeWidth="2"
                                                        style={{
                                                            transform: expandedFile === file.file_id ? 'rotate(90deg)' : 'none',
                                                            transition: 'transform 0.2s',
                                                        }}
                                                    >
                                                        <polyline points="9 18 15 12 9 6" />
                                                    </svg>
                                                    Show matched content
                                                </button>
                                                
                                                {expandedFile === file.file_id && (
                                                    <div style={{ 
                                                        marginTop: 'var(--spacing-sm)',
                                                        background: 'var(--color-gray-900)',
                                                        padding: 'var(--spacing-md)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.875rem',
                                                        color: 'var(--color-gray-300)',
                                                    }}>
                                                        {file.matched_chunks.map((chunk, i) => (
                                                            <div 
                                                                key={i}
                                                                style={{
                                                                    padding: 'var(--spacing-sm)',
                                                                    borderBottom: i < file.matched_chunks.length - 1 
                                                                        ? '1px solid var(--color-gray-700)' 
                                                                        : 'none',
                                                                }}
                                                            >
                                                                <p style={{ margin: 0, fontStyle: 'italic' }}>
                                                                    "{chunk.text}"
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexShrink: 0 }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleDownload(file.file_id, file.filename)}
                                        title="Download file"
                                        style={{ padding: 'var(--spacing-sm)' }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                    </button>
                                    <a
                                        href={`/graph?doc=${file.file_id}`}
                                        className="btn btn-secondary"
                                        title="View in graph"
                                        style={{ padding: 'var(--spacing-sm)' }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="3" />
                                            <circle cx="4" cy="8" r="2" />
                                            <circle cx="20" cy="8" r="2" />
                                            <line x1="9.5" y1="10.5" x2="6" y2="9" />
                                            <line x1="14.5" y1="10.5" x2="18" y2="9" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                )}

                {/* Stats Footer */}
                {!isLoading && !isSearching && allFiles.length > 0 && (
                    <div style={{ 
                        textAlign: 'center', 
                        marginTop: 'var(--spacing-xl)',
                        padding: 'var(--spacing-lg)',
                        color: 'var(--color-gray-500)',
                        fontSize: '0.875rem',
                    }}>
                        {allFiles.length} file{allFiles.length !== 1 ? 's' : ''} in your knowledge base
                        {' • '}
                        {allFiles.filter(f => f.file_type === 'pdf').length} PDFs
                        {' • '}
                        {allFiles.filter(f => f.file_type === 'docx').length} DOCX
                        {' • '}
                        {allFiles.filter(f => f.file_type === 'txt').length} TXT
                    </div>
                )}
            </div>
        </div>
    );
}
