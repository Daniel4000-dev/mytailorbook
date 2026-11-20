'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { parseVoiceTapeSpeech } from '@/lib/voiceTape';
import { triggerHaptic } from '@/lib/haptics';

interface UseVoiceTapeOptions {
  allowedKeys?: string[];
  keyLabels?: Record<string, string>;
  onPointCaptured: (key: string, value: string) => void;
  onCustomNoteCaptured?: (note: string) => void;
}

export function useVoiceTape({
  allowedKeys,
  keyLabels = {},
  onPointCaptured,
  onCustomNoteCaptured,
}: UseVoiceTapeOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastCapture, setLastCapture] = useState<{
    key: string;
    label: string;
    value: string;
    prevValue?: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const activeHistoryRef = useRef<{ key: string; prevValue: string }[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
    }
  }, []);

  const handleSpeechResult = useCallback(
    (transcript: string) => {
      const parsed = parseVoiceTapeSpeech(transcript, allowedKeys);
      if (!parsed) return;

      if (parsed.matchedKey && parsed.value) {
        const key = parsed.matchedKey;
        const value = parsed.value;
        const label = keyLabels[key] || key;

        triggerHaptic('success');
        setLastCapture({ key, label, value });
        onPointCaptured(key, value);
      } else if (parsed.isCustomNote && parsed.value && onCustomNoteCaptured) {
        triggerHaptic('selection');
        onCustomNoteCaptured(parsed.value);
      }
    },
    [allowedKeys, keyLabels, onPointCaptured, onCustomNoteCaptured]
  );

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-NG'; // Nigerian English locale matches local accents best

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript;
            handleSpeechResult(transcript);
          }
        }
      };

      rec.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
      };

      rec.onend = () => {
        // If user didn't explicitly stop, auto-restart to keep session alive during measurement
        if (isListening && recognitionRef.current) {
          try {
            rec.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListening(false);
    }
  }, [isListening, handleSpeechResult]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const undoLastCapture = useCallback(() => {
    if (lastCapture) {
      onPointCaptured(lastCapture.key, lastCapture.prevValue || '');
      setLastCapture(null);
    }
  }, [lastCapture, onPointCaptured]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    lastCapture,
    undoLastCapture,
  };
}

