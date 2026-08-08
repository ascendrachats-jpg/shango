import React from "react"
import type { ConversationBlock } from "../lib/conversation"

interface Props {
  block: ConversationBlock
}

export default function ConversationBlockRenderer({ block }: Props) {
  if (block.type === "idea" || block.type === "dialogue.user") {
    return (
      <div className="flex justify-end my-3">
        <div className="max-w-[85%] rounded-lg bg-slate-800 border border-slate-700/60 px-4 py-2.5 text-sm text-slate-100 leading-relaxed shadow-sm">
          {block.content}
        </div>
      </div>
    )
  }

  if (block.type === "dialogue.shango") {
    return (
      <div className="flex justify-start my-3">
        <div className="max-w-[90%] text-sm text-slate-300 leading-relaxed space-y-2">
          {block.content.split("\n").map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
      </div>
    )
  }

  if (block.type === "understanding") {
    return (
      <div className="flex justify-start my-3">
        <div className="max-w-[90%] text-sm text-slate-300 leading-relaxed border-l-2 border-amber-500/80 pl-3 py-1 bg-slate-900/40">
          <span className="font-semibold text-amber-400 block mb-1">Understanding</span>
          <p>{block.summary}</p>
        </div>
      </div>
    )
  }

  if (block.type === "plan") {
    return (
      <div className="flex justify-start my-3">
        <div className="max-w-[90%] text-sm text-slate-300 leading-relaxed space-y-2 border-l-2 border-slate-700 pl-3 py-1">
          <p className="font-medium text-slate-200">{block.heading ?? "Here's how I'd approach this:"}</p>
          <ul className="space-y-1 text-slate-400 list-disc list-inside pl-1">
            {block.steps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
          {block.decisionQuestions && block.decisionQuestions.length > 0 && (
            <div className="pt-2 text-slate-300 border-t border-slate-800/80 mt-2">
              {block.decisionQuestions.map((q, idx) => (
                <p key={idx} className="text-amber-300/90 font-mono text-xs">• {q}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (block.type === "execution") {
    return (
      <div className="flex justify-start my-3">
        <div className="max-w-[90%] text-xs font-mono text-slate-400 leading-relaxed bg-slate-900/60 border border-slate-800 rounded px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-2 text-slate-300 font-sans text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
            <span>{block.statusText}</span>
          </div>

          {block.files.length > 0 && (
            <div className="space-y-0.5 pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
              {block.files.map((f, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>{f.path}</span>
                  <span className="text-slate-500">({f.operation})</span>
                </div>
              ))}
            </div>
          )}

          {block.validationStatus && (
            <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
              {block.validationStatus === "passed" ? (
                <span className="text-emerald-400">✓ Validation passed</span>
              ) : block.validationStatus === "failed" ? (
                <span className="text-amber-400">⚠ Validation issue detected</span>
              ) : (
                <span className="text-slate-400">Checking workspace code...</span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (block.type === "result") {
    return (
      <div className="flex justify-start my-3">
        <div className="max-w-[90%] text-sm text-slate-300 leading-relaxed space-y-1">
          <p className="text-emerald-400 font-medium">{block.summary}</p>
          <p className="text-xs text-slate-400">
            {block.fileCount} file(s) updated. You can test it in Preview.
          </p>
        </div>
      </div>
    )
  }

  if (block.type === "error") {
    return (
      <div className="flex justify-start my-3">
        <div className="max-w-[90%] text-sm text-red-300 leading-relaxed border-l-2 border-red-500 pl-3 py-1 bg-red-950/20 space-y-1">
          <p className="font-medium text-red-400">{block.message}</p>
          {block.diagnostics && block.diagnostics.length > 0 && (
            <ul className="text-xs font-mono text-red-300/80 space-y-0.5 pt-1">
              {block.diagnostics.map((d, idx) => (
                <li key={idx}>[{d.code}] in {d.file}: {d.message}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  return null
}
