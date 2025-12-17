import React, { useRef, useEffect } from 'react';

export default function RichTextEditor({ value, onChange, placeholder }) {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            let html = editorRef.current.innerHTML;
            if (html === '<br>') html = '';
            onChange(html);
        }
    };

    const execCmd = (command, val = null) => {
        document.execCommand(command, false, val);
        editorRef.current.focus();
    };

    return (
        <div className="flex flex-col h-full group">
            {/* Toolbar - Floating/Visible on Focus style or just clean header */}
            <div className="flex items-center gap-1 p-2 border-b border-slate-100 mb-4 sticky top-0 bg-white z-10 transition-opacity">
                <div className="flex bg-slate-100 rounded p-1">
                    <ToolbarButton onClick={() => execCmd('formatBlock', 'p')} label="¶" title="Paragraph" />
                    <ToolbarButton onClick={() => execCmd('formatBlock', 'H2')} label="H1" title="Heading 1" />
                    <ToolbarButton onClick={() => execCmd('formatBlock', 'H3')} label="H2" title="Heading 2" />
                </div>
                <div className="w-px h-5 bg-slate-200 mx-2" />
                <div className="flex bg-slate-100 rounded p-1">
                    <ToolbarButton onClick={() => execCmd('bold')} label="B" bold title="Bold" />
                    <ToolbarButton onClick={() => execCmd('italic')} label="I" italic title="Italic" />
                    <ToolbarButton onClick={() => execCmd('underline')} label="U" underline title="Underline" />
                    <ToolbarButton onClick={() => execCmd('strikeThrough')} label="S" strike title="Strike-through" />
                </div>
                <div className="w-px h-5 bg-slate-200 mx-2" />
                <div className="flex bg-slate-100 rounded p-1">
                    <ToolbarButton onClick={() => execCmd('justifyLeft')} icon={<AlignLeftIcon />} title="Align Left" />
                    <ToolbarButton onClick={() => execCmd('justifyCenter')} icon={<AlignCenterIcon />} title="Align Center" />
                    <ToolbarButton onClick={() => execCmd('insertUnorderedList')} icon={<ListIcon />} title="Bullet List" />
                    <ToolbarButton onClick={() => execCmd('createLink', prompt('Enter URL'))} icon={<LinkIcon />} title="Link" />
                </div>
            </div>

            {/* Editor Area */}
            <div
                ref={editorRef}
                className="flex-1 outline-none text-base text-slate-700 leading-relaxed font-sans min-h-[300px] [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-slate-900 [&>h2]:mt-4 [&>h2]:mb-2 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-slate-800 [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:mb-3"
                contentEditable
                onInput={handleInput}
                placeholder={placeholder}
                style={{ whiteSpace: 'pre-wrap' }}
            />
            {(!value || value === '<br>') && (
                <div className="absolute top-[88px] left-0 pointer-events-none text-slate-300 text-base">
                    {placeholder}
                </div>
            )}
        </div>
    );
}

function ToolbarButton({ onClick, label, icon, bold, italic, underline, strike, title }) {
    return (
        <button
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={`
                p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors text-xs font-semibold w-7 h-7 flex items-center justify-center
                ${bold ? 'font-bold' : ''}
                ${italic ? 'italic' : ''}
                ${underline ? 'underline' : ''}
                ${strike ? 'line-through' : ''}
            `}
            title={title}
        >
            {icon || label}
        </button>
    );
}

// Icons
const AlignLeftIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>;
const AlignCenterIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" /></svg>;
const LinkIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
const ListIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>;
