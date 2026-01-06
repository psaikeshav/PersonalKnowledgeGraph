'use client';

import { useEffect, useState } from 'react';

// Animation helper for staggered fade-in
const useStaggeredAnimation = (count: number) => {
    const [visible, setVisible] = useState<boolean[]>(Array(count).fill(false));

    useEffect(() => {
        const timers = Array(count).fill(0).map((_, i) =>
            setTimeout(() => {
                setVisible(prev => {
                    const next = [...prev];
                    next[i] = true;
                    return next;
                });
            }, i * 100)
        );
        return () => timers.forEach(clearTimeout);
    }, [count]);

    return visible;
};

export default function HomePage() {
    const visible = useStaggeredAnimation(4);

    return (
        <div className="page">
            <div className="container">
                {/* Hero Section */}
                <section style={{
                    textAlign: 'center',
                    padding: 'var(--spacing-2xl) 0',
                    opacity: visible[0] ? 1 : 0,
                    transform: visible[0] ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.5s ease'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="1.5" style={{ color: 'var(--color-primary-500)' }}>
                            <circle cx="12" cy="12" r="3" />
                            <circle cx="4" cy="8" r="2" />
                            <circle cx="20" cy="8" r="2" />
                            <circle cx="4" cy="16" r="2" />
                            <circle cx="20" cy="16" r="2" />
                            <circle cx="12" cy="4" r="2" />
                            <circle cx="12" cy="20" r="2" />
                            <line x1="9.5" y1="10.5" x2="6" y2="9" />
                            <line x1="14.5" y1="10.5" x2="18" y2="9" />
                            <line x1="9.5" y1="13.5" x2="6" y2="15" />
                            <line x1="14.5" y1="13.5" x2="18" y2="15" />
                            <line x1="12" y1="9" x2="12" y2="6" />
                            <line x1="12" y1="15" x2="12" y2="18" />
                        </svg>
                    </div>

                    <h1 style={{
                        fontSize: '3rem',
                        marginBottom: 'var(--spacing-md)',
                        background: 'linear-gradient(135deg, var(--color-gray-50), var(--color-primary-400))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Personal Knowledge Graph Assistant
                    </h1>

                    <p style={{
                        fontSize: '1.25rem',
                        maxWidth: '700px',
                        margin: '0 auto var(--spacing-xl)',
                        color: 'var(--color-gray-400)'
                    }}>
                        Harness the power of Large Language Models and GraphRAG to build your
                        personal knowledge base, extract insights, and answer questions with
                        explainable multi-hop reasoning.
                    </p>

                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
                        <a href="/upload" className="btn btn-primary btn-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Upload Data
                        </a>
                        <a href="/query" className="btn btn-secondary btn-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            Ask Questions
                        </a>
                        <a href="/graph" className="btn btn-secondary btn-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <circle cx="4" cy="8" r="2" />
                                <circle cx="20" cy="8" r="2" />
                                <line x1="9.5" y1="10.5" x2="6" y2="9" />
                                <line x1="14.5" y1="10.5" x2="18" y2="9" />
                            </svg>
                            View Graph
                        </a>
                    </div>
                </section>

                {/* RAG Comparison Section */}
                <section style={{
                    padding: 'var(--spacing-2xl) 0',
                    opacity: visible[1] ? 1 : 0,
                    transform: visible[1] ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.5s ease'
                }}>
                    <h2 style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                        Traditional RAG vs GraphRAG
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                        gap: 'var(--spacing-xl)'
                    }}>
                        {/* Traditional RAG */}
                        <div className="card" style={{ borderLeftColor: 'var(--color-gray-500)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-gray-700)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <line x1="3" y1="9" x2="21" y2="9" />
                                        <line x1="9" y1="21" x2="9" y2="9" />
                                    </svg>
                                </div>
                                <h3 style={{ color: 'var(--color-gray-300)' }}>Traditional RAG</h3>
                            </div>

                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                                    <span style={{ color: 'var(--color-gray-500)' }}>•</span>
                                    <span style={{ color: 'var(--color-gray-400)' }}>Retrieves text chunks based on vector similarity</span>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                                    <span style={{ color: 'var(--color-gray-500)' }}>•</span>
                                    <span style={{ color: 'var(--color-gray-400)' }}>Limited to single-hop reasoning</span>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                                    <span style={{ color: 'var(--color-gray-500)' }}>•</span>
                                    <span style={{ color: 'var(--color-gray-400)' }}>Loses structural relationships between concepts</span>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                                    <span style={{ color: 'var(--color-gray-500)' }}>•</span>
                                    <span style={{ color: 'var(--color-gray-400)' }}>Hard to trace the reasoning path</span>
                                </li>
                            </ul>
                        </div>

                        {/* GraphRAG */}
                        <div className="card" style={{ borderColor: 'var(--color-primary-600)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <circle cx="12" cy="12" r="3" />
                                        <circle cx="4" cy="8" r="2" />
                                        <circle cx="20" cy="8" r="2" />
                                        <line x1="9.5" y1="10.5" x2="6" y2="9" />
                                        <line x1="14.5" y1="10.5" x2="18" y2="9" />
                                    </svg>
                                </div>
                                <h3 style={{ color: 'var(--color-primary-400)' }}>GraphRAG</h3>
                                <span className="badge badge-info">Recommended</span>
                            </div>

                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                                    <span style={{ color: 'var(--color-success)' }}>✓</span>
                                    <span style={{ color: 'var(--color-gray-300)' }}>Combines vector search with graph traversal</span>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                                    <span style={{ color: 'var(--color-success)' }}>✓</span>
                                    <span style={{ color: 'var(--color-gray-300)' }}>Enables multi-hop reasoning across entities</span>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                                    <span style={{ color: 'var(--color-success)' }}>✓</span>
                                    <span style={{ color: 'var(--color-gray-300)' }}>Preserves relationships and context</span>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                                    <span style={{ color: 'var(--color-success)' }}>✓</span>
                                    <span style={{ color: 'var(--color-gray-300)' }}>Provides explainable reasoning paths</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section style={{
                    padding: 'var(--spacing-2xl) 0',
                    opacity: visible[2] ? 1 : 0,
                    transform: visible[2] ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.5s ease'
                }}>
                    <h2 style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                        How It Works
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 'var(--spacing-lg)'
                    }}>
                        <FeatureCard
                            icon={
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            }
                            title="1. Upload Documents"
                            description="Upload your notes, papers, or documents in PDF, DOCX, or TXT format."
                        />

                        <FeatureCard
                            icon={
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                </svg>
                            }
                            title="2. Extract Knowledge"
                            description="LLMs automatically extract entities, relationships, and concepts from your text."
                        />

                        <FeatureCard
                            icon={
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <circle cx="4" cy="8" r="2" />
                                    <circle cx="20" cy="8" r="2" />
                                    <circle cx="4" cy="16" r="2" />
                                    <circle cx="20" cy="16" r="2" />
                                    <line x1="9.5" y1="10.5" x2="6" y2="9" />
                                    <line x1="14.5" y1="10.5" x2="18" y2="9" />
                                    <line x1="9.5" y1="13.5" x2="6" y2="15" />
                                    <line x1="14.5" y1="13.5" x2="18" y2="15" />
                                </svg>
                            }
                            title="3. Build Knowledge Graph"
                            description="Entities and relationships are stored in Neo4j for structured reasoning."
                        />

                        <FeatureCard
                            icon={
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    <line x1="11" y1="8" x2="11" y2="14" />
                                    <line x1="8" y1="11" x2="14" y2="11" />
                                </svg>
                            }
                            title="4. Query with GraphRAG"
                            description="Ask questions and get answers with step-by-step reasoning paths."
                        />
                    </div>
                </section>

                {/* CTA Section */}
                <section style={{
                    textAlign: 'center',
                    padding: 'var(--spacing-2xl) 0',
                    opacity: visible[3] ? 1 : 0,
                    transform: visible[3] ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.5s ease'
                }}>
                    <div className="card-glass" style={{ padding: 'var(--spacing-2xl)' }}>
                        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Ready to Get Started?</h2>
                        <p style={{ marginBottom: 'var(--spacing-xl)', color: 'var(--color-gray-400)' }}>
                            Upload your first document and explore the power of GraphRAG.
                        </p>
                        <a href="/upload" className="btn btn-primary btn-lg">
                            Start Building Your Knowledge Graph
                        </a>
                    </div>
                </section>
            </div>
        </div>
    );
}

// Feature Card Component
function FeatureCard({ icon, title, description }: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800))',
                color: 'white'
            }}>
                {icon}
            </div>
            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>{title}</h4>
            <p style={{ fontSize: '0.95rem' }}>{description}</p>
        </div>
    );
}
