import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Tách văn bản và biểu thức toán/hóa học:
  // 1. Display math: $$...$$ hoặc \[...\]
  // 2. Inline math: $...$ hoặc \(...\)
  // 3. Công thức hóa học độc lập: \ce{...}
  const renderFormattedText = () => {
    const parts = content.split(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\(.*?\\\)|\s*(?:\\ce\{[^}]+\}))/g);

    return parts.map((part, index) => {
      if (!part) return null;
      const trimmed = part.trim();

      // Display math
      if ((trimmed.startsWith('$$') && trimmed.endsWith('$$')) || (trimmed.startsWith('\\[') && trimmed.endsWith('\\]'))) {
        const math = trimmed.slice(2, -2).trim();
        if (!math) return null;
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="my-2 block text-center" />;
        } catch {
          return <span key={index}>{part}</span>;
        }
      }

      // Inline math ($...$ hoặc \(...\))
      if (
        (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length >= 2) ||
        (trimmed.startsWith('\\(') && trimmed.endsWith('\\)'))
      ) {
        const math = trimmed.startsWith('$') ? trimmed.slice(1, -1).trim() : trimmed.slice(2, -2).trim();
        if (!math) return null;
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-0.5 align-middle" />;
        } catch {
          return <span key={index}>{part}</span>;
        }
      }

      // Công thức hóa học độc lập \ce{...}
      if (trimmed.startsWith('\\ce{') && trimmed.endsWith('}')) {
        try {
          const html = katex.renderToString(trimmed, { displayMode: false, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-0.5 align-middle" />;
        } catch {
          return <span key={index}>{part}</span>;
        }
      }

      return <span key={index}>{part}</span>;
    });
  };

  return <div className={`math-content whitespace-pre-line leading-relaxed ${className}`}>{renderFormattedText()}</div>;
};
