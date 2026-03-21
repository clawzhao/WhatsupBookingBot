// Test the detection logic

const testResponses = [
  { text: "I don't know.", shouldDetect: true },
  { text: "I don't have that information.", shouldDetect: true },
  { text: "No relevant information found in the documents.", shouldDetect: true },
  { text: "123 Main Street, Downtown District", shouldDetect: false },
  { text: "We are open 9am to 10pm", shouldDetect: false }
];

const noInfoPatterns = [
  'No relevant information found',
  'could not find an answer',
  'not sure',
  "I don't know",
  "I don't have",
  'unable to find',
  'no information',
  'cannot find'
];

console.log('Testing detection logic:\n');

testResponses.forEach(test => {
  const isUnansweredQuestion = test.text && 
    noInfoPatterns.some(pattern => test.text.toLowerCase().includes(pattern.toLowerCase()));
  
  const result = isUnansweredQuestion === test.shouldDetect ? '✓ PASS' : '✗ FAIL';
  console.log(`${result}: "${test.text}"`);
  console.log(`  Expected: ${test.shouldDetect}, Got: ${isUnansweredQuestion}\n`);
});
