'use client';

import { useEffect, useRef, useState } from 'react';

// Types for graph data
interface GraphNode {
    id: string;
    name: string;
    type: string;
    source_doc?: string;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
}

interface GraphEdge {
    id: string;
    source: string | GraphNode;
    target: string | GraphNode;
    relationship: string;
}

interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: {
        entities?: number;
        relationships?: number;
        documents?: number;
    };
}

// Entity type colors
const ENTITY_COLORS: Record<string, string> = {
    Person: '#8b5cf6',
    Organization: '#06b6d4',
    Location: '#10b981',
    Concept: '#f59e0b',
    Event: '#ec4899',
    Technology: '#3b82f6',
    Product: '#ef4444',
    Document: '#64748b',
};

export default function GraphPage() {
    const svgRef = useRef<SVGSVGElement>(null);
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [entityTypes, setEntityTypes] = useState<string[]>([]);

    // Fetch graph data from real API
    useEffect(() => {
        fetchGraphData();
    }, []);

    const fetchGraphData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch real graph data from backend
            const response = await fetch('/api/graph?limit=100');

            if (!response.ok) {
                throw new Error('Failed to fetch graph data');
            }

            const data = await response.json();

            // Check if there's any data
            if (!data.nodes || data.nodes.length === 0) {
                setGraphData({ nodes: [], edges: [], stats: { entities: 0, relationships: 0, documents: 0 } });
                setEntityTypes([]);
                setLoading(false);
                return;
            }

            // Initialize positions for nodes
            const width = 800;
            const height = 600;
            data.nodes.forEach((node: GraphNode, index: number) => {
                const angle = (index / data.nodes.length) * 2 * Math.PI;
                const radius = Math.min(width, height) / 3;
                node.x = width / 2 + radius * Math.cos(angle);
                node.y = height / 2 + radius * Math.sin(angle);
            });

            setGraphData(data);

            // Extract unique entity types
            const types = Array.from(new Set(data.nodes.map((n: GraphNode) => n.type))) as string[];
            setEntityTypes(types);

        } catch (err) {
            console.error('Error fetching graph:', err);
            setError('Failed to load graph data. Make sure you have uploaded documents.');
        } finally {
            setLoading(false);
        }
    };

    // Force simulation for graph layout
    useEffect(() => {
        if (!graphData || graphData.nodes.length === 0 || !svgRef.current) return;

        const svg = svgRef.current;
        const width = svg.clientWidth || 800;
        const height = svg.clientHeight || 600;

        // Filter nodes based on type
        const filteredNodes = filterType === 'all'
            ? graphData.nodes
            : graphData.nodes.filter(n => n.type === filterType);

        const nodeIds = new Set(filteredNodes.map(n => n.id));

        const filteredEdges = graphData.edges.filter(e => {
            const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
            const targetId = typeof e.target === 'string' ? e.target : e.target.id;
            return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });

        // Initialize positions if not set
        filteredNodes.forEach(node => {
            if (node.x === undefined) node.x = Math.random() * width;
            if (node.y === undefined) node.y = Math.random() * height;
        });

        // Simple force simulation
        const simulate = () => {
            const k = 150;
            const centerX = width / 2;
            const centerY = height / 2;

            filteredNodes.forEach(node => {
                node.vx = node.vx || 0;
                node.vy = node.vy || 0;

                // Center gravity
                node.vx += (centerX - (node.x || 0)) * 0.001;
                node.vy += (centerY - (node.y || 0)) * 0.001;

                // Repulsion between nodes
                filteredNodes.forEach(other => {
                    if (node.id !== other.id) {
                        const dx = (node.x || 0) - (other.x || 0);
                        const dy = (node.y || 0) - (other.y || 0);
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const force = k / (dist * dist);
                        node.vx = (node.vx || 0) + (dx / dist) * force;
                        node.vy = (node.vy || 0) + (dy / dist) * force;
                    }
                });

                // Damping
                node.vx *= 0.9;
                node.vy *= 0.9;

                // Update position
                node.x = (node.x || 0) + (node.vx || 0);
                node.y = (node.y || 0) + (node.vy || 0);

                // Boundary constraints
                node.x = Math.max(50, Math.min(width - 50, node.x));
                node.y = Math.max(50, Math.min(height - 50, node.y));
            });

            // Edge attraction
            filteredEdges.forEach(edge => {
                const source = filteredNodes.find(n => n.id === (typeof edge.source === 'string' ? edge.source : edge.source.id));
                const target = filteredNodes.find(n => n.id === (typeof edge.target === 'string' ? edge.target : edge.target.id));

                if (source && target) {
                    const dx = (target.x || 0) - (source.x || 0);
                    const dy = (target.y || 0) - (source.y || 0);
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const targetDist = 120;
                    const force = (dist - targetDist) * 0.01;

                    source.vx = (source.vx || 0) + (dx / dist) * force;
                    source.vy = (source.vy || 0) + (dy / dist) * force;
                    target.vx = (target.vx || 0) - (dx / dist) * force;
                    target.vy = (target.vy || 0) - (dy / dist) * force;
                }
            });
        };

        // Run simulation
        for (let i = 0; i < 100; i++) simulate();

        // Force re-render
        setGraphData({ ...graphData });
    }, [graphData?.nodes.length, filterType]);

    // Get filtered data
    const getFilteredData = () => {
        if (!graphData) return { nodes: [], edges: [] };

        const filteredNodes = filterType === 'all'
            ? graphData.nodes
            : graphData.nodes.filter(n => n.type === filterType);

        const nodeIds = new Set(filteredNodes.map(n => n.id));

        const filteredEdges = graphData.edges.filter(e => {
            const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
            const targetId = typeof e.target === 'string' ? e.target : e.target.id;
            return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });

        return { nodes: filteredNodes, edges: filteredEdges };
    };

    const { nodes: displayNodes, edges: displayEdges } = getFilteredData();

    // Empty state
    if (!loading && (!graphData || graphData.nodes.length === 0)) {
        return (
            <div className="page">
                <div className="container">
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-600)" strokeWidth="1">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        <h2 style={{ marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                            No Knowledge Graph Yet
                        </h2>
                        <p style={{ color: 'var(--color-gray-400)', marginBottom: 'var(--spacing-xl)', maxWidth: '500px', margin: '0 auto var(--spacing-xl)' }}>
                            Upload documents to build your personal knowledge graph. The system will extract entities and relationships automatically.
                        </p>
                        <a href="/upload" className="btn btn-primary btn-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Upload Documents
                        </a>
                        <button
                            className="btn btn-secondary"
                            style={{ marginLeft: 'var(--spacing-md)' }}
                            onClick={fetchGraphData}
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container">
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-xl)'
                }}>
                    <div>
                        <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>Knowledge Graph</h1>
                        <p style={{ color: 'var(--color-gray-400)' }}>
                            Explore entities and relationships in your personal knowledge base
                        </p>
                    </div>

                    {/* Stats */}
                    {graphData?.stats && (
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                            <button className="btn btn-secondary" onClick={fetchGraphData}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="23 4 23 10 17 10" />
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                                Refresh
                            </button>
                            <StatBadge label="Entities" value={graphData.stats.entities || displayNodes.length} />
                            <StatBadge label="Relationships" value={graphData.stats.relationships || displayEdges.length} />
                            <StatBadge label="Documents" value={graphData.stats.documents || 0} />
                        </div>
                    )}
                </div>

                {/* Filter Controls */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)',
                    flexWrap: 'wrap'
                }}>
                    <button
                        className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilterType('all')}
                    >
                        All Types
                    </button>
                    {entityTypes.map(type => (
                        <button
                            key={type}
                            className={`btn ${filterType === type ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilterType(type)}
                            style={{
                                borderColor: ENTITY_COLORS[type] || 'var(--color-gray-600)',
                                color: filterType === type ? 'white' : ENTITY_COLORS[type] || 'var(--color-gray-400)'
                            }}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Graph Container */}
                <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 350px' : '1fr', gap: 'var(--spacing-lg)' }}>
                    <div className="graph-container">
                        {loading ? (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'var(--color-gray-400)'
                            }}>
                                <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                    <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                                <span style={{ marginLeft: '8px' }}>Loading graph...</span>
                            </div>
                        ) : error ? (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'var(--color-gray-400)'
                            }}>
                                <p style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }}>{error}</p>
                                <button className="btn btn-secondary" onClick={fetchGraphData}>Try Again</button>
                            </div>
                        ) : (
                            <svg
                                ref={svgRef}
                                width="100%"
                                height="100%"
                                style={{ cursor: 'grab' }}
                            >
                                {/* Edges */}
                                <g>
                                    {displayEdges.map(edge => {
                                        const source = displayNodes.find(n => n.id === (typeof edge.source === 'string' ? edge.source : edge.source.id));
                                        const target = displayNodes.find(n => n.id === (typeof edge.target === 'string' ? edge.target : edge.target.id));

                                        if (!source || !target) return null;

                                        const midX = ((source.x || 0) + (target.x || 0)) / 2;
                                        const midY = ((source.y || 0) + (target.y || 0)) / 2;

                                        return (
                                            <g key={edge.id}>
                                                <line
                                                    x1={source.x}
                                                    y1={source.y}
                                                    x2={target.x}
                                                    y2={target.y}
                                                    stroke="var(--color-gray-600)"
                                                    strokeWidth="2"
                                                    strokeOpacity="0.6"
                                                />
                                                <text
                                                    x={midX}
                                                    y={midY - 5}
                                                    fill="var(--color-gray-500)"
                                                    fontSize="10"
                                                    textAnchor="middle"
                                                >
                                                    {edge.relationship}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </g>

                                {/* Nodes */}
                                <g>
                                    {displayNodes.map(node => (
                                        <g
                                            key={node.id}
                                            transform={`translate(${node.x || 0}, ${node.y || 0})`}
                                            onClick={() => setSelectedNode(node)}
                                            onMouseEnter={() => setHoveredNode(node)}
                                            onMouseLeave={() => setHoveredNode(null)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <circle
                                                r={selectedNode?.id === node.id ? 28 : hoveredNode?.id === node.id ? 26 : 24}
                                                fill={ENTITY_COLORS[node.type] || '#64748b'}
                                                stroke={selectedNode?.id === node.id ? 'white' : 'none'}
                                                strokeWidth="3"
                                                style={{
                                                    transition: 'all 0.2s ease',
                                                    filter: hoveredNode?.id === node.id ? 'brightness(1.2)' : 'none'
                                                }}
                                            />
                                            <text
                                                dy="4"
                                                fill="white"
                                                fontSize="10"
                                                fontWeight="600"
                                                textAnchor="middle"
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                {node.name.length > 10 ? node.name.substring(0, 8) + '...' : node.name}
                                            </text>
                                        </g>
                                    ))}
                                </g>
                            </svg>
                        )}

                        {/* Tooltip */}
                        {hoveredNode && !selectedNode && (
                            <div
                                className="graph-tooltip"
                                style={{
                                    left: (hoveredNode.x || 0) + 30,
                                    top: (hoveredNode.y || 0) - 10
                                }}
                            >
                                <strong>{hoveredNode.name}</strong>
                                <br />
                                <span style={{ color: ENTITY_COLORS[hoveredNode.type] }}>{hoveredNode.type}</span>
                            </div>
                        )}
                    </div>

                    {/* Selected Node Details */}
                    {selectedNode && (
                        <div className="card fade-in">
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: 'var(--spacing-lg)'
                            }}>
                                <h3>Entity Details</h3>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 8px' }}
                                    onClick={() => setSelectedNode(null)}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: 'var(--radius-lg)',
                                    background: ENTITY_COLORS[selectedNode.type] || '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 'var(--spacing-md)',
                                    fontSize: '24px',
                                    color: 'white',
                                    fontWeight: 600
                                }}>
                                    {selectedNode.name.charAt(0)}
                                </div>

                                <h4 style={{ marginBottom: 'var(--spacing-xs)' }}>{selectedNode.name}</h4>
                                <span
                                    className={`entity-tag ${selectedNode.type.toLowerCase()}`}
                                    style={{
                                        background: `${ENTITY_COLORS[selectedNode.type]}20`,
                                        color: ENTITY_COLORS[selectedNode.type]
                                    }}
                                >
                                    {selectedNode.type}
                                </span>
                            </div>

                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <h5 style={{ color: 'var(--color-gray-400)', marginBottom: 'var(--spacing-sm)' }}>
                                    Source Document
                                </h5>
                                <p style={{ fontSize: '0.9rem' }}>
                                    {selectedNode.source_doc || 'No source document'}
                                </p>
                            </div>

                            <div>
                                <h5 style={{ color: 'var(--color-gray-400)', marginBottom: 'var(--spacing-sm)' }}>
                                    Connected Entities
                                </h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                    {displayEdges
                                        .filter(e => {
                                            const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
                                            const targetId = typeof e.target === 'string' ? e.target : e.target.id;
                                            return sourceId === selectedNode.id || targetId === selectedNode.id;
                                        })
                                        .map(edge => {
                                            const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
                                            const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
                                            const connectedId = sourceId === selectedNode.id ? targetId : sourceId;
                                            const connected = displayNodes.find(n => n.id === connectedId);

                                            return connected && (
                                                <div
                                                    key={edge.id}
                                                    style={{
                                                        padding: 'var(--spacing-sm)',
                                                        background: 'var(--color-gray-800)',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => setSelectedNode(connected)}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                        <div style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            background: ENTITY_COLORS[connected.type] || '#64748b'
                                                        }} />
                                                        <span style={{ fontWeight: 500 }}>{connected.name}</span>
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                                                        {edge.relationship}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Legend */}
                {displayNodes.length > 0 && (
                    <div style={{
                        marginTop: 'var(--spacing-xl)',
                        padding: 'var(--spacing-lg)',
                        background: 'var(--color-gray-800)',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--spacing-lg)',
                        justifyContent: 'center'
                    }}>
                        <span style={{ color: 'var(--color-gray-400)', fontWeight: 500 }}>Entity Types:</span>
                        {entityTypes.map(type => (
                            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: ENTITY_COLORS[type] || '#64748b'
                                }} />
                                <span style={{ fontSize: '0.9rem', color: 'var(--color-gray-300)' }}>{type}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Stat Badge Component
function StatBadge({ label, value }: { label: string; value: number }) {
    return (
        <div style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'var(--color-gray-800)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-primary-400)' }}>
                {value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
                {label}
            </div>
        </div>
    );
}
