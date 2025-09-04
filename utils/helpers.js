function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return re.test(password);
}

function generateRandomPhrase() {
  const phrases = [
    'My voice is my password',
    'Hello, this is my verification phrase',
    'I am speaking to verify my identity',
    'This is my unique voice signature',
    'Voice verification is secure and convenient',
    'Please verify my identity with my voice',
    'I consent to voice authentication',
    'This voice sample is for verification purposes',
  ];

  return phrases[Math.floor(Math.random() * phrases.length)];
}

module.exports = {
  validateEmail,
  validatePassword,
  generateRandomPhrase,
};
