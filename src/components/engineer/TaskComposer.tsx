import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  isFinal: boolean;
  0: SpeechAlternative;
}
interface SpeechResultList {
  length: number;
  [index: number]: SpeechResult;
}
interface SpeechEvent {
  resultIndex: number;
  results: SpeechResultList;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function speechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export interface TaskComposerProps {
  onSubmit: (prompt: string) => Promise<void>;
  pending: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Text + mobile voice entry. Voice uses the browser's own Web Speech API —
 * free, no third-party voice service, transcript shown before submission.
 */
export function TaskComposer({ onSubmit, pending, disabled, placeholder }: TaskComposerProps) {
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const baseText = useRef("");

  const stop = useCallback(() => {
    recognition.current?.stop();
    recognition.current = null;
    setListening(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = () => {
    const Ctor = speechCtor();
    if (!Ctor) {
      setVoiceError("Voice input is not available in this browser — type the instruction instead.");
      return;
    }
    setVoiceError(null);
    baseText.current = prompt ? `${prompt.trim()} ` : "";
    const instance = new Ctor();
    instance.lang = "en-US";
    instance.continuous = true;
    instance.interimResults = true;
    instance.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result) transcript += result[0]?.transcript ?? "";
      }
      setPrompt(`${baseText.current}${transcript}`.trimStart());
    };
    instance.onerror = (event) => {
      setVoiceError(
        event.error === "not-allowed"
          ? "Microphone permission was declined — type the instruction instead."
          : `Voice input stopped (${event.error ?? "unknown error"}).`,
      );
      setListening(false);
    };
    instance.onend = () => setListening(false);
    recognition.current = instance;
    instance.start();
    setListening(true);
  };

  const submit = async () => {
    const text = prompt.trim();
    if (text.length < 8 || pending || disabled) return;
    await onSubmit(text);
    setPrompt("");
    stop();
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void submit();
        }}
        placeholder={
          placeholder ?? "Describe the change you want, e.g. “Add a build timestamp to Settings”"
        }
        rows={4}
        disabled={disabled}
        aria-label="Engineering instruction"
        className={cn("resize-y bg-background/60", listening && "ring-1 ring-primary")}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={listening ? "destructive" : "secondary"}
          size="sm"
          onClick={() => (listening ? stop() : start())}
          aria-pressed={listening}
          disabled={disabled}
        >
          {listening ? <MicOff className="mr-1.5 h-4 w-4" /> : <Mic className="mr-1.5 h-4 w-4" />}
          {listening ? "Stop" : "Speak"}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void submit()}
          disabled={pending || disabled || prompt.trim().length < 8}
          className="ml-auto"
        >
          <Send className="mr-1.5 h-4 w-4" />
          {pending ? "Queueing…" : "Queue task"}
        </Button>
      </div>
      {listening && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Listening — your words appear above before anything is sent.
        </p>
      )}
      {voiceError && (
        <p className="text-xs text-destructive" role="status">
          {voiceError}
        </p>
      )}
    </div>
  );
}
