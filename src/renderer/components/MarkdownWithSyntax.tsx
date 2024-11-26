import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import '@xyflow/react/dist/style.css';

interface MarkdownWithSyntaxProps {
    children: string;
    showRaw?: boolean;
}


const MarkdownWithSyntax = ({ children, showRaw = false }: MarkdownWithSyntaxProps) => {
    if (showRaw) {
        return <pre className="whitespace-pre-wrap">{children}</pre>;
    }

    return (
        <ReactMarkdown
            components={{
                code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                        <SyntaxHighlighter
                            style={dracula}
                            language={match[1]}
                            PreTag="div"
                            className="[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full"
                            {...(props as any)}
                        >
                            {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                    ) : (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                },
                p: ({ children }) => <p className="my-1">{children}</p>,
                ul: ({ children }) => <ul className="my-1 pl-4">{children}</ul>,
                ol: ({ children }) => <ol className="my-1 pl-4">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl font-bold my-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold my-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold my-1.5">{children}</h3>,
                h4: ({ children }) => <h4 className="text-base font-semibold my-1.5">{children}</h4>,
                h5: ({ children }) => <h5 className="text-sm font-semibold my-1">{children}</h5>,
                h6: ({ children }) => <h6 className="text-sm font-medium my-1">{children}</h6>,
                blockquote: ({ children }) => <blockquote className="my-0.5 pl-2 border-l-2 border-gray-400">{children}</blockquote>,
                hr: () => <hr className="my-1" />,
                table: ({ children }) => <table className="my-0.5">{children}</table>,
                pre: ({ children }) => <pre className="my-0.5">{children}</pre>,
            }}
            className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        >
            {children}
        </ReactMarkdown>
    );
};

export default MarkdownWithSyntax
