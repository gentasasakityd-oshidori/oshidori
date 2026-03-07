"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StoryReaderProps {
  text: string;
  title?: string;
}

export function StoryReader({ text, title }: StoryReaderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      window.speechSynthesis?.cancel();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startReading = useCallback(() => {
    if (!isSupported) return;

    window.speechSynthesis.cancel();
    const fullText = title ? `${title}。${text}` : text;
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = "ja-JP";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // 日本語の音声を優先選択
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find((v) => v.lang.startsWith("ja"));
    if (jaVoice) utterance.voice = jaVoice;

    utterance.onend = () => {
      setIsPlaying(false);
      setProgress(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setProgress(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);

    // 疑似プログレス（Web Speech APIは正確な進捗を提供しないため概算）
    const estimatedDurationMs = fullText.length * 150; // 1文字≒150ms
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / estimatedDurationMs) * 100, 99);
      setProgress(p);
    }, 200);
  }, [isSupported, text, title]);

  const togglePause = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    } else {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  if (!isSupported) return null;

  const isSpeaking = window.speechSynthesis?.speaking || false;

  return (
    <div className="flex items-center gap-2">
      {!isSpeaking ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={startReading}
          className="gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <Volume2 className="h-3.5 w-3.5" />
          読み上げ
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePause}
            className="h-7 w-7"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-primary" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={stop}
            className="h-7 w-7"
          >
            <Square className="h-3 w-3 text-muted-foreground" />
          </Button>
          {/* プログレスバー */}
          <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
