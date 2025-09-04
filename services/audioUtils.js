// Create a new file: audioUtils.js
class AudioUtils {
  static bufferToInt16Array(buffer) {
    const int16Array = new Int16Array(buffer.length / 2);
    for (let i = 0; i < buffer.length; i += 2) {
      int16Array[i / 2] = buffer.readInt16LE(i);
    }
    return int16Array;
  }

  static normalizeAudio(audioData) {
    if (!audioData || audioData.length === 0) return audioData;

    // Find maximum absolute value
    let maxVal = 0;
    for (let i = 0; i < audioData.length; i++) {
      const absVal = Math.abs(audioData[i]);
      if (absVal > maxVal) maxVal = absVal;
    }

    if (maxVal === 0) return audioData;

    // Normalize
    const normalized = new Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      normalized[i] = audioData[i] / maxVal;
    }

    return normalized;
  }
}

module.exports = AudioUtils;
