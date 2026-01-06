'use client';

import { useState } from 'react';

// Types
type QueryMode = 'vector' | 'graph' | 'hybrid';

interface ReasoningStep {
    step_number: number;
    description: string;
    entities_involved: string[];
    relationships_used: string[];
    evidence: string;
}

interface Evidence {
    source_doc: string;
    chunk_text: string;
    relevance_score: number;
    entities: string[];
}

interface GraphContext {
    nodes: Array<{ id: string; name: string; type: string }>;
    edges: Array<{ source: string; target: string; relationship: string }>;
    stats: { node_count: number; edge_count: number };
}

interface QueryResult {
    question: string;
    answer: string;
    reasoning_path: ReasoningStep[];
    evidence: Evidence[];
    graph_context: GraphContext;
    mode_used: QueryMode;
    processing_time_ms: number;
}

export default function QueryPage() {
    const [question, setQuestion] = useState('');
    const [mode, setMode] = useState<QueryMode>('hybrid');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'answer' | 'reasoning' | 'evidence'>('answer');

    // Example questions for demo
    const exampleQuestions = [
        "How does GraphRAG improve over traditional RAG?",
        "What is the relationship between Neo4j and knowledge graphs?",
        "Explain multi-hop reasoning in the context of question answering",
    ];

    // Submit query
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    mode,
                    top_k: 5,
                    max_hops: 2
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Query failed. Make sure you have uploaded documents first.');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Query failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Mock result for demonstration
    const getMockResult = (q: string, m: QueryMode): QueryResult => ({
        question: q,
        answer: `Based on my analysis using ${m === 'hybrid' ? 'GraphRAG (combining vector search with knowledge graph traversal)' : m === 'graph' ? 'knowledge graph traversal' : 'vector similarity search'}, here's what I found:

GraphRAG represents a significant advancement over traditional Retrieval-Augmented Generation (RAG) approaches. While traditional RAG relies solely on vector similarity search to retrieve relevant text chunks, GraphRAG combines this with structured knowledge from a knowledge graph.

The key advantages include:
1. **Multi-hop Reasoning**: GraphRAG can traverse relationships between entities to find indirect connections
2. **Structural Context**: By preserving entity relationships, it maintains the semantic structure of information
3. **Explainability**: The reasoning path through the graph provides transparency in how answers are derived

This hybrid approach is particularly effective for complex questions that require understanding relationships between multiple concepts.`,
        reasoning_path: [
            {
                step_number: 1,
                description: "Analyzed question to identify key concepts: 'GraphRAG', 'traditional RAG', 'improvement'",
                entities_involved: ['GraphRAG', 'RAG'],
                relationships_used: [],
                evidence: q
            },
            {
                step_number: 2,
                description: "Retrieved 5 relevant text chunks via semantic search",
                entities_involved: [],
                relationships_used: [],
                evidence: "Top result score: 0.92"
            },
            {
                step_number: 3,
                description: "Traversed knowledge graph from GraphRAG entity, found 8 related entities",
                entities_involved: ['GraphRAG', 'Knowledge Graph', 'Vector Database', 'Neo4j', 'Multi-hop Reasoning'],
                relationships_used: ['uses', 'combines', 'enables'],
                evidence: "Path: GraphRAG → uses → Knowledge Graph → implemented_with → Neo4j"
            },
            {
                step_number: 4,
                description: "Synthesized answer from document and graph context",
                entities_involved: [],
                relationships_used: [],
                evidence: "Combined insights from 5 chunks and 8 graph entities"
            }
        ],
        evidence: [
            {
                source_doc: "graphrag_overview.pdf",
                chunk_text: "GraphRAG combines the power of large language models with structured knowledge graphs, enabling more accurate and explainable question answering compared to traditional vector-only approaches.",
                relevance_score: 0.92,
                entities: ['GraphRAG', 'LLM', 'Knowledge Graph']
            },
            {
                source_doc: "rag_comparison.txt",
                chunk_text: "Traditional RAG systems retrieve text chunks based solely on vector similarity, which can miss important structural relationships between concepts. GraphRAG addresses this by incorporating graph traversal.",
                relevance_score: 0.87,
                entities: ['RAG', 'Vector Similarity']
            },
            {
                source_doc: "multi_hop_reasoning.docx",
                chunk_text: "Multi-hop reasoning allows the system to follow chains of relationships in the knowledge graph, connecting information across multiple documents and entities.",
                relevance_score: 0.83,
                entities: ['Multi-hop Reasoning', 'Knowledge Graph']
            }
        ],
        graph_context: {
            nodes: [
                { id: '1', name: 'GraphRAG', type: 'Concept' },
                { id: '2', name: 'Knowledge Graph', type: 'Technology' },
                { id: '3', name: 'Vector Database', type: 'Technology' },
                { id: '4', name: 'Multi-hop Reasoning', type: 'Concept' },
                { id: '5', name: 'RAG', type: 'Concept' },
            ],
            edges: [
                { source: '1', target: '2', relationship: 'uses' },
                { source: '1', target: '3', relationship: 'combines' },
                { source: '1', target: '4', relationship: 'enables' },
                { source: '5', target: '3', relationship: 'relies_on' },
            ],
            stats: { node_count: 5, edge_count: 4 }
        },
        mode_used: m,
        processing_time_ms: Math.random() * 1000 + 500
    });

    return (
        <div className="page">
            <div className="container">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
                    <h1 style={{ marginBottom: 'var(--spacing-md)' }}>Ask Questions</h1>
                    <p style={{ color: 'var(--color-gray-400)', maxWidth: '600px', margin: '0 auto' }}>
                        Use GraphRAG to query your knowledge base with natural language.
                        Get answers with step-by-step reasoning and source citations.
                    </p>
                </div>

                {/* Query Form */}
                <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto var(--spacing-2xl)' }}>
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <textarea
                            className="input textarea"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Enter your question..."
                            rows={3}
                            style={{ fontSize: '1.1rem' }}
                        />
                    </div>

                    {/* Mode Selection */}
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: 'var(--spacing-sm)',
                            color: 'var(--color-gray-400)',
                            fontSize: '0.9rem'
                        }}>
                            Query Mode
                        </label>
                        <div className="toggle-group">
                            <button
                                type="button"
                                className={`toggle-option ${mode === 'vector' ? 'active' : ''}`}
                                onClick={() => setMode('vector')}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    </svg>
                                    Vector Search
                                </span>
                            </button>
                            <button
                                type="button"
                                className={`toggle-option ${mode === 'graph' ? 'active' : ''}`}
                                onClick={() => setMode('graph')}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="3" />
                                        <circle cx="5" cy="7" r="2" />
                                        <circle cx="19" cy="7" r="2" />
                                        <line x1="9.5" y1="10.5" x2="7" y2="8.5" />
                                        <line x1="14.5" y1="10.5" x2="17" y2="8.5" />
                                    </svg>
                                    Graph Traversal
                                </span>
                            </button>
                            <button
                                type="button"
                                className={`toggle-option ${mode === 'hybrid' ? 'active' : ''}`}
                                onClick={() => setMode('hybrid')}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                        <path d="M2 17l10 5 10-5" />
                                        <path d="M2 12l10 5 10-5" />
                                    </svg>
                                    Hybrid GraphRAG
                                </span>
                            </button>
                        </div>
                        <p style={{
                            marginTop: 'var(--spacing-sm)',
                            fontSize: '0.8rem',
                            color: 'var(--color-gray-500)'
                        }}>
                            {mode === 'vector' && 'Uses semantic similarity to find relevant text chunks'}
                            {mode === 'graph' && 'Traverses the knowledge graph to find related entities'}
                            {mode === 'hybrid' && 'Combines vector search with graph traversal for best results (recommended)'}
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                        disabled={isLoading || !question.trim()}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                    <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                Search Knowledge Base
                            </>
                        )}
                    </button>
                </form>

                {/* Error Message */}
                {error && (
                    <div style={{
                        maxWidth: '800px',
                        margin: '0 auto var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid var(--color-error)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-error)',
                        textAlign: 'center'
                    }}>
                        {error}
                        <div style={{ marginTop: 'var(--spacing-sm)' }}>
                            <a href="/upload" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                                Upload Documents First
                            </a>
                        </div>
                    </div>
                )}

                {/* Example Questions */}
                {!result && (
                    <div style={{ maxWidth: '800px', margin: '0 auto var(--spacing-2xl)' }}>
                        <p style={{
                            color: 'var(--color-gray-500)',
                            marginBottom: 'var(--spacing-sm)',
                            fontSize: '0.9rem'
                        }}>
                            Try an example:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                            {exampleQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.85rem' }}
                                    onClick={() => setQuestion(q)}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }} className="fade-in">
                        {/* Result Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--spacing-lg)'
                        }}>
                            <div>
                                <span className="badge badge-success">
                                    {result.mode_used.toUpperCase()} Mode
                                </span>
                                <span style={{
                                    marginLeft: 'var(--spacing-md)',
                                    color: 'var(--color-gray-500)',
                                    fontSize: '0.875rem'
                                }}>
                                    {result.processing_time_ms.toFixed(0)}ms
                                </span>
                            </div>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setResult(null)}
                            >
                                New Query
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="toggle-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <button
                                className={`toggle-option ${activeTab === 'answer' ? 'active' : ''}`}
                                onClick={() => setActiveTab('answer')}
                            >
                                Answer
                            </button>
                            <button
                                className={`toggle-option ${activeTab === 'reasoning' ? 'active' : ''}`}
                                onClick={() => setActiveTab('reasoning')}
                            >
                                Reasoning Path ({result.reasoning_path.length} steps)
                            </button>
                            <button
                                className={`toggle-option ${activeTab === 'evidence' ? 'active' : ''}`}
                                onClick={() => setActiveTab('evidence')}
                            >
                                Evidence ({result.evidence.length} sources)
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'answer' && (
                            <div className="result-section slide-in">
                                <h4>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    Answer
                                </h4>
                                <div style={{
                                    color: 'var(--color-gray-200)',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.7
                                }}>
                                    {result.answer}
                                </div>

                                {/* Mini Graph Context */}
                                {result.graph_context.nodes.length > 0 && (
                                    <div style={{ marginTop: 'var(--spacing-xl)' }}>
                                        <h5 style={{ color: 'var(--color-gray-400)', marginBottom: 'var(--spacing-md)' }}>
                                            Related Entities
                                        </h5>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                                            {result.graph_context.nodes.map(node => (
                                                <span
                                                    key={node.id}
                                                    className={`entity-tag ${node.type.toLowerCase()}`}
                                                >
                                                    {node.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'reasoning' && (
                            <div className="result-section slide-in">
                                <h4>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2">
                                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                    </svg>
                                    Reasoning Path
                                </h4>
                                <p style={{
                                    color: 'var(--color-gray-400)',
                                    marginBottom: 'var(--spacing-lg)',
                                    fontSize: '0.9rem'
                                }}>
                                    Step-by-step explanation of how the answer was derived
                                </p>

                                {result.reasoning_path.map((step, index) => (
                                    <div key={index} className="reasoning-step">
                                        <div className="step-number">{step.step_number}</div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-gray-200)' }}>
                                                {step.description}
                                            </p>

                                            {step.entities_involved.length > 0 && (
                                                <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>Entities: </span>
                                                    {step.entities_involved.map((e, i) => (
                                                        <span key={i} className="entity-tag concept">{e}</span>
                                                    ))}
                                                </div>
                                            )}

                                            {step.relationships_used.length > 0 && (
                                                <div>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>Relations: </span>
                                                    {step.relationships_used.map((r, i) => (
                                                        <span key={i} className="badge" style={{ marginRight: '4px' }}>{r}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'evidence' && (
                            <div className="result-section slide-in">
                                <h4>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                    Source Documents
                                </h4>
                                <p style={{
                                    color: 'var(--color-gray-400)',
                                    marginBottom: 'var(--spacing-lg)',
                                    fontSize: '0.9rem'
                                }}>
                                    Evidence from your knowledge base used to generate the answer
                                </p>

                                {result.evidence.map((ev, index) => (
                                    <div key={index} className="evidence-card">
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 'var(--spacing-sm)'
                                        }}>
                                            <span className="evidence-source">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '4px' }}>
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                </svg>
                                                {ev.source_doc}
                                            </span>
                                            <span className="badge badge-info">
                                                {(ev.relevance_score * 100).toFixed(0)}% match
                                            </span>
                                        </div>
                                        <p className="evidence-text">"{ev.chunk_text}"</p>
                                        {ev.entities.length > 0 && (
                                            <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                                {ev.entities.map((e, i) => (
                                                    <span key={i} className="entity-tag concept" style={{ fontSize: '0.75rem' }}>{e}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Mode Explanation Cards */}
                {!result && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 'var(--spacing-lg)',
                        marginTop: 'var(--spacing-2xl)'
                    }}>
                        <ModeCard
                            title="Vector Search"
                            description="Uses semantic similarity to find relevant text chunks from your documents."
                            icon={
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8" cy="8" r="2" />
                                    <circle cx="16" cy="16" r="2" />
                                </svg>
                            }
                            features={['Fast retrieval', 'Semantic matching', 'Best for simple queries']}
                        />
                        <ModeCard
                            title="Graph Traversal"
                            description="Navigates the knowledge graph to find related entities and relationships."
                            icon={
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <circle cx="5" cy="7" r="2" />
                                    <circle cx="19" cy="7" r="2" />
                                    <circle cx="5" cy="17" r="2" />
                                    <circle cx="19" cy="17" r="2" />
                                    <line x1="9.5" y1="10.5" x2="7" y2="8.5" />
                                    <line x1="14.5" y1="10.5" x2="17" y2="8.5" />
                                    <line x1="9.5" y1="13.5" x2="7" y2="15.5" />
                                    <line x1="14.5" y1="13.5" x2="17" y2="15.5" />
                                </svg>
                            }
                            features={['Multi-hop reasoning', 'Relationship discovery', 'Structural insights']}
                        />
                        <ModeCard
                            title="Hybrid GraphRAG"
                            description="Combines both approaches for comprehensive, explainable answers."
                            icon={
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                    <path d="M2 17l10 5 10-5" />
                                    <path d="M2 12l10 5 10-5" />
                                </svg>
                            }
                            features={['Best of both worlds', 'Rich context', 'Recommended for most queries']}
                            highlighted
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// Mode Card Component
function ModeCard({
    title,
    description,
    icon,
    features,
    highlighted
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    features: string[];
    highlighted?: boolean;
}) {
    return (
        <div
            className="card"
            style={highlighted ? { borderColor: 'var(--color-primary-600)' } : {}}
        >
            <div style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-lg)',
                background: highlighted
                    ? 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800))'
                    : 'var(--color-gray-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                marginBottom: 'var(--spacing-md)'
            }}>
                {icon}
            </div>

            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>
                {title}
                {highlighted && <span className="badge badge-info" style={{ marginLeft: '8px' }}>Recommended</span>}
            </h4>
            <p style={{ marginBottom: 'var(--spacing-md)', fontSize: '0.9rem' }}>{description}</p>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                {features.map((feature, i) => (
                    <li key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        fontSize: '0.85rem',
                        color: 'var(--color-gray-400)'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {feature}
                    </li>
                ))}
            </ul>
        </div>
    );
}
