import argparse
import json
from pathlib import Path

from faster_whisper import WhisperModel


def transcribe_with_device(model_name: str, audio_path: str, device: str):
    compute_type = "float16" if device == "cuda" else "int8"
    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        vad_filter=True,
        word_timestamps=False,
        condition_on_previous_text=True,
    )
    return list(segments), info


def main() -> None:
    parser = argparse.ArgumentParser(description="Transcribe a workbench audio file locally.")
    parser.add_argument("audio")
    parser.add_argument("output")
    parser.add_argument("--model", default="small")
    args = parser.parse_args()

    try:
        segments, info = transcribe_with_device(args.model, args.audio, "cuda")
        device = "cuda"
    except Exception:
        segments, info = transcribe_with_device(args.model, args.audio, "cpu")
        device = "cpu"

    rows = []
    full_text = []
    for segment in segments:
        text = segment.text.strip()
        if not text:
            continue
        rows.append(
            {
                "start": round(float(segment.start), 3),
                "end": round(float(segment.end), 3),
                "text": text,
                "avg_logprob": round(float(segment.avg_logprob), 4),
                "no_speech_prob": round(float(segment.no_speech_prob), 4),
            }
        )
        full_text.append(text)

    payload = {
        "engine": "faster-whisper",
        "model": args.model,
        "device": device,
        "language": info.language,
        "language_probability": round(float(info.language_probability), 4),
        "duration": round(float(info.duration), 3),
        "full_text": " ".join(full_text),
        "segments": rows,
    }
    # ASCII-safe JSON prevents Windows terminal code pages from corrupting
    # Chinese/Japanese/Korean transcripts when Codex inspects the task package.
    Path(args.output).write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
