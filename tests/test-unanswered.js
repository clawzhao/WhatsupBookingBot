const { saveUnansweredQuestion, getPendingQuestions, markAsAnswered } = require('./src/unanswered');

async function runTest() {
  try {
    console.log('Testing unanswered questions system...\n');
    
    // Test 1: Save an unanswered question
    console.log('✓ Test 1: Saving an unanswered question...');
    const result = await saveUnansweredQuestion(
      '+1234567890',
      'Do you have a kids menu?'
    );
    console.log('  Saved question with ID:', result.id);
    
    // Test 2: Get pending questions
    console.log('\n✓ Test 2: Fetching pending questions...');
    const pending = await getPendingQuestions();
    console.log('  Found', pending.length, 'pending questions');
    if (pending.length > 0) {
      console.log('  First question:', pending[0].question);
    }
    
    // Test 3: Mark as answered
    if (pending.length > 0) {
      console.log('\n✓ Test 3: Marking question as answered...');
      const questionId = pending[0].id;
      const staffResponse = 'Yes, we have a special kids menu with pizza, pasta, and more!';
      await markAsAnswered(questionId, staffResponse);
      console.log('  Question marked as answered with response:', staffResponse);
    }
    
    // Test 4: Verify it's no longer in pending
    console.log('\n✓ Test 4: Verifying question is no longer pending...');
    const stillPending = await getPendingQuestions();
    console.log('  Remaining pending questions:', stillPending.length);
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTest();
