// Document state with coalesced undo/redo history and debounced localStorage autosave.
import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEY } from './engine';
import { createDoc, loadStoredDoc } from './templates';

const LIMIT = 80;
const COALESCE_MS = 900;

export default function useDocHistory() {
  const [initial] = useState(() => {
    const stored = loadStoredDoc();
    return { doc: stored || createDoc(), pristine: !stored };
  });
  const [doc, setDoc] = useState(initial.doc);
  const [hist, setHist] = useState({ canUndo: false, canRedo: false });
  const [saveStatus, setSaveStatus] = useState('saved');
  const docRef = useRef(initial.doc);
  const pristineRef = useRef(initial.pristine);
  const stackRef = useRef({ past: [], future: [], lastKey: null, lastTime: 0 });

  const sync = () => {
    const s = stackRef.current;
    setHist({ canUndo: s.past.length > 0, canRedo: s.future.length > 0 });
  };

  const applyDoc = useCallback((updater, { history = true, key = null } = {}) => {
    const prev = docRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    if (!next || next === prev) return;
    if (history) {
      const s = stackRef.current;
      const now = Date.now();
      if (!(key && s.lastKey === key && now - s.lastTime < COALESCE_MS)) {
        s.past.push(prev);
        if (s.past.length > LIMIT) s.past.shift();
      }
      s.future = [];
      s.lastKey = key;
      s.lastTime = now;
      sync();
    }
    pristineRef.current = false;
    docRef.current = next;
    setDoc(next);
  }, []);

  // Replace the doc without touching history (used to re-measure the pristine default after fonts load).
  const replaceSilently = useCallback((next) => {
    docRef.current = next;
    setDoc(next);
  }, []);

  const undo = useCallback(() => {
    const s = stackRef.current;
    if (!s.past.length) return;
    s.future.push(docRef.current);
    docRef.current = s.past.pop();
    s.lastKey = null;
    pristineRef.current = false;
    setDoc(docRef.current);
    sync();
  }, []);

  const redo = useCallback(() => {
    const s = stackRef.current;
    if (!s.future.length) return;
    s.past.push(docRef.current);
    docRef.current = s.future.pop();
    s.lastKey = null;
    setDoc(docRef.current);
    sync();
  }, []);

  useEffect(() => {
    if (pristineRef.current) return undefined;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
        setSaveStatus('saved');
      } catch {
        setSaveStatus('full');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [doc]);

  return { doc, docRef, pristineRef, applyDoc, replaceSilently, undo, redo, hist, saveStatus };
}
