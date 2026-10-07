"""
Generates assets/spinner-music.mp3 - the folk tune "Sevivon, Sov, Sov, Sov" (סביבון סוב סוב סוב),
played while the spinner spins.

    python3 design-resources/generate-spinner-music.py

Synthesized from the melody (traditional, D minor, 4/4) with a music-box timbre over a simple
oom-pah accompaniment (i, iv, V7). Requires numpy and ffmpeg (with libmp3lame).
Also copies the result to the Android assets folder.
"""
import os
import shutil
import subprocess
import tempfile
import wave

import numpy as np

Root = os.path.join(os.path.dirname(__file__), "..")
Output = os.path.join(Root, "assets", "spinner-music.mp3")
AndroidOutput = os.path.join(Root, "android", "app", "src", "main", "assets", "spinner-music.mp3")

Rate = 44100
Tempo = 132  # quarter notes per minute
Beat = 60 / Tempo

# MIDI note numbers
A3, Cs4, D4, E4, F4, G4, A4, Bb4 = 57, 61, 62, 64, 65, 67, 69, 70
Rest = None

# (note, beats) per bar
Verse = [
    [(D4, 1), (D4, 1), (E4, 2)],                                # Se-vi-von,
    [(F4, 1), (F4, 1), (E4, 2)],                                # sov, sov, sov!
    [(A4, 1), (A4, 1), (G4, .5), (F4, .5), (E4, .5), (D4, .5)],  # Cha-nu-kah,
    [(F4, 1), (F4, 1), (E4, 2)],                                # hu chag tov;
    [(D4, 1), (D4, 1), (E4, 2)],                                # Cha-nu-kah,
    [(F4, 1), (F4, 1), (G4, 2)],                                # hu chag tov,
    [(A4, 1), (A4, 1), (A4, 1), (A3, 1)],                       # Se-vi-von
    [(D4, 1), (D4, 1), (D4, 1), (Rest, 1)],                     # sov, sov, sov!
]
Chorus = [
    [(G4, 1), (G4, 1), (G4, 1), (Bb4, 1)],                      # Chag sim-chah
    [(A4, 1), (A4, 1), (F4, .5), (E4, .5), (D4, 1)],            # hu la-am,
    [(Cs4, 1), (Cs4, 1), (A3, 1), (Cs4, 1)],                    # Nes ga-dol
    [(D4, 1), (E4, 1), (F4, .5), (E4, .5), (D4, 1)],            # ha-yah sham;
    [(G4, 1), (G4, 1), (G4, 1), (Bb4, 1)],                      # Nes ga-dol
    [(A4, 1), (A4, 1), (F4, .5), (E4, .5), (D4, 1)],            # ha-yah sham,
    [(Cs4, 1), (Cs4, 1), (A3, 1), (Cs4, 1)],                    # Chag sim-chah
    [(D4, 1), (D4, 1), (D4, 1), (Rest, 1)],                     # hu la-am.
]
Melody = Verse + Chorus

# chords: (bass root, bass fifth, chord tones)
Dm = (50, 45, [53, 57, 62])
Gm = (43, 50, [55, 58, 62])
A7 = (45, 52, [55, 61, 64])
# one chord per half bar
Harmony = [
    (Dm, Dm), (Dm, A7), (Dm, Dm), (Dm, A7), (Dm, Dm), (Gm, Gm), (A7, A7), (Dm, Dm),
    (Gm, Gm), (Dm, Dm), (A7, A7), (Dm, A7), (Gm, Gm), (Dm, Dm), (A7, A7), (Dm, Dm),
]


def freq(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def tone(note, seconds, partials, decay, volume):
    """a plucked/struck tone: sum of decaying partials with a short attack"""
    n = int(seconds * Rate)
    t = np.arange(n) / Rate
    f = freq(note)
    out = np.zeros(n)
    for ratio, amp, partialDecay in partials:
        out += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * decay * partialDecay)
    attack = np.minimum(1, t / 0.004)
    release = np.minimum(1, (seconds - t) / 0.03)
    return out * attack * release * volume


MusicBox = [(1, 1.0, 1), (2, 0.35, 1.8), (3, 0.12, 2.5), (4.16, 0.06, 4)]
Bass = [(1, 1.0, 1), (2, 0.5, 1.3), (3, 0.2, 1.6)]
Pad = [(1, 1.0, 1), (2, 0.25, 1.5)]


def mix(track, start, sound):
    i = int(start * Rate)
    end = min(len(track), i + len(sound))
    track[i:end] += sound[:end - i]


def render():
    length = len(Melody) * 4 * Beat + 1.0
    track = np.zeros(int(length * Rate))

    t = 0.0
    for bar in Melody:
        for note, beats in bar:
            if note is not Rest:
                # let the note ring a little over the next one, like a music box
                mix(track, t, tone(note, beats * Beat + 0.35, MusicBox, 2.2, 0.5))
            t += beats * Beat

    for barIndex, halves in enumerate(Harmony):
        barStart = barIndex * 4 * Beat
        for half, (root, fifth, chord) in enumerate(halves):
            start = barStart + half * 2 * Beat
            bassNote = root if half == 0 or halves[0] != halves[1] else fifth
            mix(track, start, tone(bassNote, Beat * 1.2, Bass, 3.5, 0.32))
            for note in chord:
                mix(track, start + Beat, tone(note, Beat * 0.9, Pad, 5, 0.07))

    track /= np.max(np.abs(track)) * 1.12
    fade = int(0.5 * Rate)
    track[-fade:] *= np.linspace(1, 0, fade)
    return track


def main():
    track = render()
    with tempfile.TemporaryDirectory() as tmp:
        wavPath = os.path.join(tmp, "music.wav")
        with wave.open(wavPath, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(Rate)
            w.writeframes((track * 32767).astype(np.int16).tobytes())
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wavPath,
                        "-codec:a", "libmp3lame", "-b:a", "96k", Output], check=True)
    shutil.copyfile(Output, AndroidOutput)
    print("Wrote", Output, "and", AndroidOutput)


if __name__ == "__main__":
    main()
