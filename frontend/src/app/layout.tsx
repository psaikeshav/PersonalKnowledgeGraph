import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Personal Knowledge Graph Assistant',
    description: 'A GraphRAG-powered knowledge management system with multi-hop reasoning',
    keywords: ['knowledge graph', 'GraphRAG', 'AI', 'NLP', 'question answering'],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <Navigation />
                <main>{children}</main>
            </body>
        </html>
    );
}

// Navigation Component
function Navigation() {
    return (
        <nav className="navbar">
            <a href="/" className="navbar-brand">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                Knowledge Graph Assistant
            </a>
            <div className="navbar-links">
                <a href="/" className="navbar-link">Home</a>
                <a href="/upload" className="navbar-link">Upload</a>
                <a href="/graph" className="navbar-link">Graph</a>
                <a href="/query" className="navbar-link">Query</a>
                <a href="/files" className="navbar-link">My Files</a>
            </div>
        </nav>
    );
}
