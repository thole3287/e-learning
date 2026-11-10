import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Tách văn bản và biểu thức toán ($...$ hoặc $$...$$)
  const renderFormattedText = () => {
    // Regex tìm $...$ (inline) hoặc $$...$$ (display)
    const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2);
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="my-2 block text-center" />;
        } catch {
          return <span key={index}>{part}</span>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-0.5" />;
        } catch {
          return <span key={index}>{part}</span>;
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  return <div className={`math-content whitespace-pre-line leading-relaxed ${className}`}>{renderFormattedText()}</div>;
};
