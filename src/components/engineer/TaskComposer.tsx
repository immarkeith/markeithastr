import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
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
 * iMessage-style pinned composer bar: rounded input with mic and send buttons.
 * Voice uses the browser's own Web Speech API — free, no third-party voice
 * service, transcript shown in the input before anything is sent.
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
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-end gap-1.5 rounded-3xl border border-border bg-card p-1.5 shadow-sm",
          listening && "ring-1 ring-primary",
        )}
      >
        <Button
          type="button"
          variant={listening ? "destructive" : "ghost"}
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={() => (listening ? stop() : start())}
          aria-pressed={listening}
          aria-label={listening ? "Stop voice input" : "Start voice input"}
          disabled={disabled}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void submit();
          }}
          placeholder={placeholder ?? "Message ASTR Engineer…"}
          rows={Math.min(4, Math.max(1, prompt.split("\n").length))}
          disabled={disabled}
          aria-label="Engineering instruction"
          className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={() => void submit()}
          disabled={pending || disabled || prompt.trim().length < 8}
          aria-label={pending ? "Queueing task" : "Send instruction"}
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
      {listening && (
        <p className="px-3 text-[11px] text-muted-foreground" aria-live="polite">
          Listening — your words appear in the box before anything is sent.
        </p>
      )}
      {voiceError && (
        <p className="px-3 text-[11px] text-destructive" role="status">
          {voiceError}
        </p>
      )}
    </div>
  );
}
