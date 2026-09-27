import React, { useState } from 'react';
import { Copy, Check, Table, Download } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function highlightSyntax(code: string, language: string): string {
  const lang = (language || 'text').toLowerCase().trim();
  if (lang === 'text' || lang === 'plain' || lang === 'plaintext') {
    return escapeHtml(code);
  }

  // Multi-group regex for robust, conflict-free syntax highlighting
  const tokenRegex = new RegExp(
    [
      '(\\/\\/[^\\n]*|#(?!!\\[)[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|<!--[\\s\\S]*?-->)', // 1: Comments
      '("(?:\\\\[\\s\\S]|[^"\\\\])*"|\'(?:\\\\[\\s\\S]|[^\\\'\\\\])*\'|`(?:\\\\[\\s\\S]|[^`\\\\])*`)', // 2: Strings
      '\\b(0x[0-9a-fA-F]+|\\d+(?:\\.\\d+)?)\\b', // 3: Numbers
      '\\b(true|false|null|undefined|None|True|False|nil)\\b', // 4: Booleans / null
      '\\b(const|let|var|function|def|return|import|export|from|as|class|extends|implements|if|else|elif|for|while|async|await|try|catch|finally|throw|raise|new|typeof|instanceof|interface|type|enum|switch|case|default|break|continue|yield|public|private|protected|static|readonly|SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|JOIN|LEFT|RIGHT|INNER|GROUP|ORDER|BY|LIMIT|CREATE|TABLE|ALTER|DROP|echo|set)\\b', // 5: Keywords
      '\\b([A-Z][a-zA-Z0-9_]*|void|any|never|unknown|string|number|boolean|int|float|str|dict|list|tuple|bytes)\\b', // 6: Types & Built-ins
      '\\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\\s*\\()', // 7: Functions
      '(=>|===|!==|==|!=|&&|\\|\\||<=|>=|[-+*\\/%!=<>]=?)', // 8: Operators
    ].join('|'),
    'g'
  );

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    // Escape text preceding the matched token
    if (match.index > lastIndex) {
      result += escapeHtml(code.substring(lastIndex, match.index));
    }

    const matchedText = match[0];
    const [ , p1, p2, p3, p4, p5, p6, p7, p8 ] = match;

    if (p1) {
      result += `<span class="syn-com">${escapeHtml(matchedText)}</span>`;
    } else if (p2) {
      result += `<span class="syn-str">${escapeHtml(matchedText)}</span>`;
    } else if (p3) {
      result += `<span class="syn-num">${escapeHtml(matchedText)}</span>`;
    } else if (p4) {
      result += `<span class="syn-bool">${escapeHtml(matchedText)}</span>`;
    } else if (p5) {
      result += `<span class="syn-kw">${escapeHtml(matchedText)}</span>`;
    } else if (p6) {
      result += `<span class="syn-type">${escapeHtml(matchedText)}</span>`;
    } else if (p7) {
      result += `<span class="syn-fn">${escapeHtml(matchedText)}</span>`;
    } else if (p8) {
      result += `<span class="syn-op">${escapeHtml(matchedText)}</span>`;
    } else {
      result += escapeHtml(matchedText);
    }

    lastIndex = match.index + matchedText.length;
  }

  if (lastIndex < code.length) {
    result += escapeHtml(code.substring(lastIndex));
  }

  return result;
}

const LANGUAGE_EXTENSIONS: Record<string, { ext: string; defaultName: string }> = {
  javascript: { ext: '.js', defaultName: 'script.js' },
  js: { ext: '.js', defaultName: 'script.js' },
  typescript: { ext: '.ts', defaultName: 'app.ts' },
  ts: { ext: '.ts', defaultName: 'app.ts' },
  tsx: { ext: '.tsx', defaultName: 'Component.tsx' },
  jsx: { ext: '.jsx', defaultName: 'Component.jsx' },
  java: { ext: '.java', defaultName: 'Main.java' },
  c: { ext: '.c', defaultName: 'main.c' },
  cpp: { ext: '.cpp', defaultName: 'main.cpp' },
  'c++': { ext: '.cpp', defaultName: 'main.cpp' },
  cs: { ext: '.cs', defaultName: 'Program.cs' },
  csharp: { ext: '.cs', defaultName: 'Program.cs' },
  html: { ext: '.html', defaultName: 'index.html' },
  css: { ext: '.css', defaultName: 'styles.css' },
  python: { ext: '.py', defaultName: 'script.py' },
  py: { ext: '.py', defaultName: 'script.py' },
  sql: { ext: '.sql', defaultName: 'query.sql' },
  json: { ext: '.json', defaultName: 'data.json' },
  rust: { ext: '.rs', defaultName: 'main.rs' },
  rs: { ext: '.rs', defaultName: 'main.rs' },
  go: { ext: '.go', defaultName: 'main.go' },
  golang: { ext: '.go', defaultName: 'main.go' },
  bash: { ext: '.sh', defaultName: 'script.sh' },
  sh: { ext: '.sh', defaultName: 'script.sh' },
  shell: { ext: '.sh', defaultName: 'script.sh' },
  bat: { ext: '.bat', defaultName: 'script.bat' },
  batch: { ext: '.bat', defaultName: 'script.bat' },
  ruby: { ext: '.rb', defaultName: 'script.rb' },
  rb: { ext: '.rb', defaultName: 'script.rb' },
  php: { ext: '.php', defaultName: 'index.php' },
  swift: { ext: '.swift', defaultName: 'main.swift' },
  kotlin: { ext: '.kt', defaultName: 'Main.kt' },
  kt: { ext: '.kt', defaultName: 'Main.kt' },
  yaml: { ext: '.yaml', defaultName: 'config.yaml' },
  yml: { ext: '.yml', defaultName: 'config.yml' },
  xml: { ext: '.xml', defaultName: 'data.xml' },
  markdown: { ext: '.md', defaultName: 'document.md' },
  md: { ext: '.md', defaultName: 'document.md' },
  dockerfile: { ext: '', defaultName: 'Dockerfile' },
  text: { ext: '.txt', defaultName: 'snippet.txt' },
  plaintext: { ext: '.txt', defaultName: 'snippet.txt' }
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [downloadedIndex, setDownloadedIndex] = useState<number | null>(null);
  const [copiedTableId, setCopiedTableId] = useState<string | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadCode = (codeText: string, language: string, index: number) => {
    const cleanLang = (language || 'text').toLowerCase().trim();
    const meta = LANGUAGE_EXTENSIONS[cleanLang] || { ext: `.${cleanLang || 'txt'}`, defaultName: `code_${index + 1}.${cleanLang || 'txt'}` };
    const fileName = meta.defaultName || `code_${index + 1}${meta.ext}`;
    
    const blob = new Blob([codeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedIndex(index);
    setTimeout(() => setDownloadedIndex(null), 2000);
  };

  const handleCopyTable = async (
    headerCells: string[],
    bodyRows: string[][],
    buttonId: string,
    format: 'excel' | 'csv'
  ) => {
    const allRows = [headerCells, ...bodyRows];

    if (format === 'excel') {
      // Format as Tab-Separated Values (TSV)
      // When pasted into Excel or Google Sheets, tabs separate columns and line breaks separate rows
      const tsv = allRows
        .map(row =>
          row
            .map(cell => {
              const clean = stripMarkdown(cell);
              if (clean.includes('\t') || clean.includes('\n') || clean.includes('\r') || clean.includes('"')) {
                return `"${clean.replace(/"/g, '""')}"`;
              }
              return clean;
            })
            .join('\t')
        )
        .join('\r\n');

      // Construct HTML table representation for rich clipboard pasting in Excel
      const htmlTable = `<table><thead><tr>${headerCells
        .map(h => `<th>${escapeHtml(stripMarkdown(h))}</th>`)
        .join('')}</tr></thead><tbody>${bodyRows
        .map(row => `<tr>${row.map(c => `<td>${escapeHtml(stripMarkdown(c))}</td>`).join('')}</tr>`)
        .join('')}</tbody></table>`;

      try {
        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
          const textBlob = new Blob([tsv], { type: 'text/plain' });
          const htmlBlob = new Blob([htmlTable], { type: 'text/html' });
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/plain': textBlob,
              'text/html': htmlBlob
            })
          ]);
        } else {
          await navigator.clipboard.writeText(tsv);
        }
      } catch {
        await navigator.clipboard.writeText(tsv);
      }
    } else {
      // Format as CSV (Comma-Separated Values)
      const csv = allRows
        .map(row =>
          row
            .map(cell => {
              const clean = stripMarkdown(cell);
              if (clean.includes(',') || clean.includes('"') || clean.includes('\n') || clean.includes('\r')) {
                return `"${clean.replace(/"/g, '""')}"`;
              }
              return clean;
            })
            .join(',')
        )
        .join('\r\n');

      await navigator.clipboard.writeText(csv);
    }

    setCopiedTableId(buttonId);
    setTimeout(() => setCopiedTableId(null), 2500);
  };

  const handleDownloadCSV = (headerCells: string[], bodyRows: string[][]) => {
    const allRows = [headerCells, ...bodyRows];
    const csv = allRows
      .map(row =>
        row
          .map(cell => {
            const clean = stripMarkdown(cell);
            if (clean.includes(',') || clean.includes('"') || clean.includes('\n') || clean.includes('\r')) {
              return `"${clean.replace(/"/g, '""')}"`;
            }
            return clean;
          })
          .join(',')
      )
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Split content by code fences ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const segments: { type: 'text' | 'code'; content: string; language?: string }[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      });
    }
    segments.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trimEnd()
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }

  const renderTable = (tableLines: string[], key: number | string) => {
    if (tableLines.length < 2) return null;
    const parseRow = (line: string) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cell => cell.trim());

    const headerCells = parseRow(tableLines[0]);
    const bodyRows = tableLines
      .slice(1)
      .filter(line => !line.trim().replace(/^\||\|$/g, '').split('|').every(c => /^[\s\-:]+$/.test(c)))
      .map(parseRow);

    const excelButtonId = `${key}-excel`;
    const csvButtonId = `${key}-csv`;

    return (
      <div
        key={key}
        className="my-4 rounded-xl border border-neutral-300 dark:border-[#383838] overflow-hidden bg-white dark:bg-[#181818] shadow-xs"
      >
        {/* Table header bar with copy options */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-neutral-100/90 dark:bg-[#262626] border-b border-neutral-200 dark:border-[#333333] text-xs font-sans">
          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 font-medium">
            <Table className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>Table</span>
            <span className="text-neutral-400 dark:text-neutral-500 text-[11px] font-normal">
              ({bodyRows.length} {bodyRows.length === 1 ? 'row' : 'rows'}, {headerCells.length} cols)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Copy for Excel button */}
            <button
              type="button"
              onClick={() => handleCopyTable(headerCells, bodyRows, excelButtonId, 'excel')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                copiedTableId === excelButtonId
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'text-neutral-700 dark:text-neutral-200 bg-neutral-200/60 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15'
              }`}
              title="Copy as Tab-Separated Values (TSV). Pastes directly into Excel cells across columns and rows!"
            >
              {copiedTableId === excelButtonId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied for Excel!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy for Excel</span>
                </>
              )}
            </button>

            {/* Copy as CSV button */}
            <button
              type="button"
              onClick={() => handleCopyTable(headerCells, bodyRows, csvButtonId, 'csv')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                copiedTableId === csvButtonId
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-white/5'
              }`}
              title="Copy as Comma-Separated Values (CSV)"
            >
              {copiedTableId === csvButtonId ? <span>CSV Copied!</span> : <span>CSV</span>}
            </button>

            {/* Download CSV button */}
            <button
              type="button"
              onClick={() => handleDownloadCSV(headerCells, bodyRows)}
              className="flex items-center gap-1 p-1 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Download as .csv spreadsheet file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable table grid */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm border-collapse">
            <thead className="bg-[#f7f7f8] dark:bg-[#202020] text-neutral-900 dark:text-neutral-100 font-semibold border-b border-neutral-200 dark:border-[#333333]">
              <tr>
                {headerCells.map((h, i) => (
                  <th key={i} className="px-4 py-2.5 whitespace-nowrap font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatInlineText(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-[#333333]">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-neutral-50 dark:hover:bg-[#202022] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2.5 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                      {formatInlineText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTextBlocks = (text: string) => {
    const rawLines = text.split('\n');
    const nodes: React.ReactNode[] = [];
    let currentTable: string[] = [];

    const flushTable = () => {
      if (currentTable.length > 0) {
        nodes.push(renderTable(currentTable, `table-${nodes.length}`));
        currentTable = [];
      }
    };

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      // Table line detection: starts with '|' or contains multiple '|' (standard markdown tables)
      const trimmed = line.trim();
      const isTableRow =
        (trimmed.startsWith('|') && trimmed.includes('|')) ||
        (trimmed.includes('|') && (currentTable.length > 0 || (rawLines[i + 1] && rawLines[i + 1].includes('---'))));

      if (isTableRow) {
        currentTable.push(line);
        continue;
      } else {
        flushTable();
      }

      // Heading 3
      if (line.startsWith('### ')) {
        nodes.push(
          <h3 key={i} className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mt-5 mb-2 tracking-tight">
            {formatInlineText(line.slice(4))}
          </h3>
        );
        continue;
      }
      // Heading 2
      if (line.startsWith('## ')) {
        nodes.push(
          <h2 key={i} className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-6 mb-2.5 tracking-tight">
            {formatInlineText(line.slice(3))}
          </h2>
        );
        continue;
      }
      // Heading 1
      if (line.startsWith('# ')) {
        nodes.push(
          <h1 key={i} className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-7 mb-3 tracking-tight">
            {formatInlineText(line.slice(2))}
          </h1>
        );
        continue;
      }
      // Blockquote
      if (line.startsWith('> ')) {
        nodes.push(
          <blockquote
            key={i}
            className="border-l-[3px] border-neutral-400 dark:border-neutral-500 pl-4 my-3 text-neutral-600 dark:text-neutral-300 italic text-[15px]"
          >
            {formatInlineText(line.slice(2))}
          </blockquote>
        );
        continue;
      }
      // Bullet list item
      if (line.startsWith('- ') || line.startsWith('* ')) {
        nodes.push(
          <div key={i} className="flex items-start gap-2.5 my-1.5 ml-2 text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-200">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 dark:bg-neutral-400 mt-2 flex-shrink-0" />
            <div className="flex-1">{formatInlineText(line.slice(2))}</div>
          </div>
        );
        continue;
      }
      // Numbered list item
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        nodes.push(
          <div key={i} className="flex items-start gap-2.5 my-1.5 ml-2 text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-200">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-5 flex-shrink-0 text-right mt-0.5">
              {numMatch[1]}.
            </span>
            <div className="flex-1">{formatInlineText(numMatch[2])}</div>
          </div>
        );
        continue;
      }
      // Blank line spacing
      if (!line.trim()) {
        nodes.push(<div key={i} className="h-3" />);
        continue;
      }
      // Regular paragraph
      nodes.push(
        <p key={i} className="text-neutral-800 dark:text-[#ececec] text-[15.5px] leading-[1.72] my-2">
          {formatInlineText(line)}
        </p>
      );
    }
    flushTable();
    return nodes;
  };

  const formatInlineText = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-[#f0f0f0] dark:bg-[#2f2f2f] font-mono text-[13px] text-neutral-900 dark:text-neutral-100 border border-black/5 dark:border-white/10"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-neutral-950 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="markdown-body space-y-0.5 select-text">
      {segments.map((segment, idx) => {
        if (segment.type === 'code') {
          const lang = segment.language || 'text';
          const isCopied = copiedIndex === idx;

          return (
            <div
              key={idx}
              className="my-4 rounded-xl overflow-hidden bg-[#0d0d0d] text-neutral-100 border border-[#303030] shadow-sm"
            >
              {/* ChatGPT exact code header bar with Copy and Download */}
              <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 bg-[#252525] border-b border-[#353535] text-xs font-sans text-[#b4b4b4]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-neutral-300 font-semibold lowercase tracking-wide">
                    {lang}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono hidden xs:inline">
                    {segment.content.split('\n').length} lines
                  </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Download Code as File Button */}
                  <button
                    type="button"
                    onClick={() => handleDownloadCode(segment.content, lang, idx)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer text-xs"
                    title={`Download as ${LANGUAGE_EXTENSIONS[lang.toLowerCase()]?.defaultName || 'file'}`}
                  >
                    {downloadedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-sky-400 stroke-[2.5]" />
                        <span className="text-sky-400 font-medium">Downloaded!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                        <span className="sm:hidden">Save</span>
                      </>
                    )}
                  </button>

                  {/* Copy Code Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyCode(segment.content, idx)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer text-xs"
                    title="Copy code to clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Copy code</span>
                        <span className="sm:hidden">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code snippet body */}
              <div className="p-4 overflow-x-auto text-[13.5px] leading-[1.65] font-mono select-text bg-[#0d0d0d]">
                <pre
                  dangerouslySetInnerHTML={{
                    __html: highlightSyntax(segment.content, lang)
                  }}
                />
              </div>
            </div>
          );
        }

        return <React.Fragment key={idx}>{renderTextBlocks(segment.content)}</React.Fragment>;
      })}
    </div>
  );
};
