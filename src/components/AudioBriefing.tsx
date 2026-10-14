import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause, RotateCcw, Loader2, Sparkles, VolumeX } from 'lucide-react';
import { ScanRecord } from '../types/scan.ts';

interface AudioBriefingProps {
  scan: ScanRecord;
}

export const AudioBriefing: React.FC<AudioBriefingProps> = ({ scan }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const counts = scan.summaryCounts || {
    violations: 0,
    passes: 0,
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };

  let hostname = scan.url;
  try {
    hostname = new URL(scan.url).hostname;
  } catch {}

  // Script text grounded strictly in real counts
  const totalRules = counts.violations + counts.passes;
  const briefingText = `Accessibility audit briefing for ${hostname}. Axe-core evaluated ${totalRules} rules. Found ${counts.violations} accessibility violations: ${counts.critical} critical, ${counts.serious} serious, ${counts.moderate} moderate, and ${counts.minor} minor. ${counts.passes} rules passed all automated checks.`;

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handlePlayToggle = async () => {
    setAudioError(null);

    // If audio already loaded, toggle play/pause
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err: any) {
          setAudioError('Audio playback failed: ' + err.message);
        }
      }
      return;
    }

    // Otherwise fetch synthesized audio from backend
    setIsLoadingAudio(true);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: briefingText,
          scanId: scan.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.onerror = () => {
        setAudioError('Failed to decode synthesized audio.');
        setIsPlaying(false);
      };

      await audio.play();
      setIsPlaying(true);
    } catch (err: any) {
      console.error('TTS Briefing Error:', err);
      // Fallback: Use browser's native Web Speech API if server TTS is unavailable
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(briefingText);
        utterance.rate = 1.0;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      } else {
        setAudioError(err.message || 'Speech synthesis is currently unavailable.');
      }
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-5 mb-8 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
            <Volume2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Voice Assistant Briefing</h2>
              <span className="text-[11px] text-slate-400 font-mono">Gemini TTS</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Listen to spoken summary of verified findings and WCAG counts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handlePlayToggle}
            disabled={isLoadingAudio}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            aria-label={isPlaying ? 'Pause spoken audit summary' : 'Listen to spoken audit summary'}
          >
            {isLoadingAudio ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Synthesizing...</span>
              </>
            ) : isPlaying ? (
              <>
                <Pause className="w-4 h-4" aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" aria-hidden="true" />
                <span>Play Briefing</span>
              </>
            )}
          </button>

          {audioUrl && (
            <button
              type="button"
              onClick={handleRestart}
              className="p-2 text-slate-400 hover:text-white bg-[#090D16] border border-[#1E293B] rounded-lg transition-colors cursor-pointer"
              title="Restart audio from beginning"
              aria-label="Restart audio from beginning"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Transcript for Screen Readers & Transparency */}
      <div className="mt-4 pt-3 border-t border-[#1E293B]">
        <p className="text-xs text-slate-300 leading-relaxed font-sans bg-[#090D16]/60 p-3 rounded-lg border border-[#1E293B]/60">
          <span className="font-semibold text-sky-400 mr-1.5">Spoken Transcript:</span>
          "{briefingText}"
        </p>
      </div>

      {audioError && (
        <div className="mt-3 text-xs text-amber-400 flex items-center gap-1.5" role="alert">
          <VolumeX className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{audioError} (Browser speech synthesis will be used if available).</span>
        </div>
      )}
    </div>
  );
};
