import Editor, { loader, OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { registerAsmLanguage } from "./asmLanguage";
import { registerSnippets } from "./exploitSnippets";
import { registerIntelligentComplete } from "./intelligentComplete";
import { registerNullForgeTheme } from "./nullforgeTheme";
import { getAppearanceConfig } from "../Settings/AppearanceSettings";

// Tell @monaco-editor/react to use the local monaco instead of CDN
loader.config({ monaco });

// One-time Monaco setup (idempotent)
let monacoInitialized = false;
function initMonaco() {
  if (monacoInitialized) return;
  monacoInitialized = true;
  registerNullForgeTheme(monaco);
  registerAsmLanguage(monaco);
  registerSnippets(monaco);
  registerIntelligentComplete(monaco);

  monaco.editor.defineTheme("nullforge-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword",    foreground: "0369a1", fontStyle: "bold" },
      { token: "comment",    foreground: "64748b", fontStyle: "italic" },
      { token: "string",     foreground: "15803d" },
      { token: "number",     foreground: "c2410c" },
      { token: "type",       foreground: "b45309" },
      { token: "variable",   foreground: "dc2626", fontStyle: "bold" },
      { token: "identifier", foreground: "0f172a" },
    ],
    colors: {
      "editor.background":              "#f4f4f5",
      "editor.foreground":              "#0f172a",
      "editor.lineHighlightBackground": "#f1f5f9",
      "editor.selectionBackground":     "#bfdbfe",
      "editorLineNumber.foreground":    "#94a3b8",
      "editorCursor.foreground":        "#e63946",
      "editorWidget.background":        "#ffffff",
      "editorSuggestWidget.background": "#ffffff",
      "editorSuggestWidget.border":     "#e2e8f0",
      "input.background":               "#ffffff",
      "input.border":                   "#e2e8f0",
      "minimap.background":             "#f4f4f5",
    },
  });

  // Relax JS diagnostics (Monaco has no Python LSP — only JS/TS workers)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (monaco.languages as any).typescript?.javascriptDefaults?.setDiagnosticsOptions?.({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
}

export interface MonacoEditorWrapperProps {
  value: string;
  language: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  path?: string;
}

export function MonacoEditorWrapper({
  value,
  language,
  onChange,
  readOnly = false,
  path,
}: MonacoEditorWrapperProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  initMonaco();

  const [editorOptions, setEditorOptions] = useState(() => {
    const cfg = getAppearanceConfig();
    return {
      fontFamily: cfg.fontFamily,
      fontSize: cfg.fontSize,
      lineHeight: cfg.lineHeight,
      tabSize: cfg.tabSize,
      minimap: { enabled: cfg.showMinimap, scale: 1 },
    };
  });

  const [monacoTheme, setMonacoTheme] = useState(() =>
    document.documentElement.classList.contains("theme-light") ? "nullforge-light" : "nullforge-dark"
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const cfg = (e as CustomEvent).detail;
      if (!cfg) return;
      setEditorOptions({
        fontFamily: cfg.fontFamily,
        fontSize: cfg.fontSize,
        lineHeight: cfg.lineHeight,
        tabSize: cfg.tabSize,
        minimap: { enabled: cfg.showMinimap, scale: 1 },
      });
    };
    window.addEventListener("nullforge:settings-changed", handler);
    return () => window.removeEventListener("nullforge:settings-changed", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      const isLight = document.documentElement.classList.contains("theme-light");
      setMonacoTheme(isLight ? "nullforge-light" : "nullforge-dark");
    };
    window.addEventListener("nullforge:theme-changed", handler);
    return () => window.removeEventListener("nullforge:theme-changed", handler);
  }, []);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Exploit-specific keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      // Inline AI — placeholder; Phase 3 will wire this up
      const selection = editor.getSelection();
      const selectedText = selection
        ? editor.getModel()?.getValueInRange(selection)
        : "";
      const event = new CustomEvent("nullforge:inline-ai", {
        detail: { selectedText },
      });
      window.dispatchEvent(event);
    });

    // Format document
    editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      () => editor.getAction("editor.action.formatDocument")?.run()
    );
  };

  // Sync value when it changes externally (e.g., tab switch)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (model && model.getValue() !== value) {
      model.pushEditOperations(
        [],
        [{ range: model.getFullModelRange(), text: value }],
        () => null
      );
    }
  }, [value]);

  return (
    <Editor
      height="100%"
      theme={monacoTheme}
      language={language}
      value={value}
      path={path}
      options={{
        ...editorOptions,
        insertSpaces: true,
        wordWrap: "off",
        scrollbar: {
          vertical: "visible",
          horizontal: "visible",
          useShadows: false,
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
        glyphMargin: true,
        lineNumbers: "on",
        lineNumbersMinChars: 4,
        folding: true,
        foldingHighlight: true,
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: "active",
          indentation: true,
        },
        renderLineHighlight: "line",
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        multiCursorModifier: "ctrlCmd",
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: true },
        snippetSuggestions: "top",
        inlineSuggest: { enabled: true },
        parameterHints: { enabled: true },
        formatOnPaste: false,
        formatOnType: false,
        autoIndent: "full",
        readOnly,
        contextmenu: true,
        mouseWheelZoom: true,
        renderWhitespace: "selection",
        stickyScroll: { enabled: true },
        "semanticHighlighting.enabled": true,
      }}
      onChange={(val) => onChange?.(val ?? "")}
      onMount={handleMount}
      loading={
        <div className="flex items-center justify-center h-full text-text-muted text-xs">
          Loading editor...
        </div>
      }
    />
  );
}
