import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';

const CodeEditor = ({ code, onChange, readOnly = false }) => {
  return (
    <div className="h-full w-full overflow-hidden bg-[#1a1b26] text-sm">
      <CodeMirror
        value={code}
        height="100%"
        theme={tokyoNight}
        extensions={[python()]}
        onChange={onChange}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
        className="h-full text-base"
      />
    </div>
  );
};

export default CodeEditor;