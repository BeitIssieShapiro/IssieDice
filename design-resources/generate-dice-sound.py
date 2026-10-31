"""
Generates assets/dice-sound-1.wav .. dice-sound-3.wav - the dice collision sound, from the recorded knock
(dice-sound-recording.mp3).

    python3 design-resources/generate-dice-sound.py

The recording is short and cut while still ringing, with an uneven decay. This keeps its first click,
evens the decay to a smooth exponential one, and continues the ringing (noise with the recording's
spectrum) until it fades to silence. The variants differ slightly in pitch, so repeated hits do not
sound identical. WAV rather than MP3, as MP3 adds silence at the start (a delayed hit).
Requires numpy and ffmpeg. Also copies the results to the Android assets folder.
"""
import os
import shutil
import subprocess
import wave

import numpy as np

Here = os.path.dirname(__file__)
Root = os.path.join(Here, "..")
Source = os.path.join(Here, "dice-sound-recording.mp3")
Outputs = os.path.join(Root, "assets", "dice-sound-%d.wav")
AndroidOutputs = os.path.join(Root, "android", "app", "src", "main", "assets", "dice-sound-%d.wav")

Rate = 48000
Duration = 0.25     # sec
Tau = 0.042         # sec - decay time constant (fitted to the recording)
ClickTime = 0.012   # sec - kept as recorded
TailStart = 0.055   # sec - crossfade from the recording into the generated ringing
HighPass = 150      # Hz - removes the recording's low rumble
Peak = 0.134        # the recording's peak level
Pitches = [1.0, 1.05, 0.95]


def load():
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", Source, "-f", "s16le", "-ac", "1",
                          "-ar", str(Rate), "-"], check=True, capture_output=True).stdout
    x = np.frombuffer(raw, dtype="<i2").astype(float) / 32768
    onset = np.argmax(np.abs(x) > 0.02)
    return x[max(0, onset - 24):]  # from 0.5ms before the hit


def envelope(s, width=240):
    k = np.hanning(width)
    k /= k.sum()
    return np.sqrt(np.convolve(s * s, k, "same")) + 1e-6


def highpass(s):
    spectrum = np.fft.rfft(s)
    f = np.fft.rfftfreq(len(s), 1 / Rate)
    spectrum /= np.sqrt(1 + (HighPass / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(spectrum, len(s))


def render(recording, seed, pitch):
    rng = np.random.default_rng(seed)
    total = int(Rate * Duration)
    t = np.arange(total) / Rate
    s = highpass(recording)

    # the ringing: noise with the spectrum of the recording after the click
    body = s[int(Rate * 0.01):]
    mag = np.abs(np.fft.rfft(body * np.hanning(len(body)), total))
    mag = np.convolve(mag, np.ones(9) / 9, "same")
    tail = np.fft.irfft(mag * np.exp(2j * np.pi * rng.random(len(mag))), total)

    e = envelope(s)
    peak = np.argmax(e)
    target = e[peak] * np.exp(-np.maximum(0, t - peak / Rate) / Tau)

    rec = np.zeros(total)
    rec[:len(s)] = s[:total]
    gain = np.clip(target / envelope(rec), 0.4, 2.5)
    w = np.clip((t - ClickTime) / 0.01, 0, 1)
    rec *= 1 - w + w * gain
    tail *= target / envelope(tail)

    c = np.clip((t - TailStart) / 0.02, 0, 1)
    c = 0.5 - 0.5 * np.cos(np.pi * c)
    out = rec * (1 - c) + tail * c
    fade = int(Rate * 0.05)
    out[-fade:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fade))
    out[:24] *= np.linspace(0, 1, 24)
    if pitch != 1:
        out = np.interp(np.arange(0, len(out) - 1, pitch), np.arange(len(out)), out)
    return out / np.max(np.abs(out)) * Peak


def main():
    recording = load()
    for i, pitch in enumerate(Pitches):
        out = render(recording, i, pitch)
        path = Outputs % (i + 1)
        with wave.open(path, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(Rate)
            w.writeframes((out * 32767).astype("<i2").tobytes())
        shutil.copyfile(path, AndroidOutputs % (i + 1))
        print("Wrote", path, "and", AndroidOutputs % (i + 1))


if __name__ == "__main__":
    main()
