class PhraseService {
  constructor() {
    this.phrases = [
      'My voice is my password',
      'The quick brown fox jumps over the lazy dog',
      'I am speaking to verify my identity',
      'This is my unique voice signature',
      'Voice authentication is secure and convenient',
    ];
  }

  generatePhrase() {
    const randomIndex = Math.floor(Math.random() * this.phrases.length);
    return this.phrases[randomIndex];
  }
}

module.exports = PhraseService;
