# Unanswered Questions System - Implementation Summary

## ✅ What Was Implemented

When users ask the bot a question it doesn't know the answer to, the system now:

1. **Detects Unknown Answers** - Identifies when the chatbot cannot provide relevant information
2. **Sends Polite Response to User** - Instead of a harsh "I don't know", users receive:
   ```
   Thank you for your question! 😊
   
   I don't have the answer right now, but let me check and get back to you soon. 
   Our team will review your question and respond as soon as possible.
   
   You can also call us at +1234567890 for immediate assistance.
   ```
3. **Saves Question for Staff** - Automatically stores all unanswered questions in the database
4. **Provides Staff Portal** - Staff can:
   - View all pending questions via API
   - Mark questions as answered
   - Provide staff responses

## 📁 Files Created

- **src/unanswered.js** - Core module for managing unanswered questions
  - `saveUnansweredQuestion()` - Save a customer question
  - `getPendingQuestions()` - Get only pending questions
  - `getAllQuestions()` - Get all questions (with pagination)
  - `markAsAnswered()` - Mark question as answered with staff response

## 🔧 Files Modified

- **src/whatsapp.js** - Updated to:
  - Detect unanswered questions from chatbot
  - Save them to database
  - Send polite message to user instead of "I don't know"

- **src/index.js** - Added three new API endpoints:
  - `GET /api/unanswered-questions/pending` - View pending questions
  - `GET /api/unanswered-questions?limit=50&offset=0` - Paginated list
  - `POST /api/unanswered-questions/:id/respond` - Mark as answered

## 🧪 Testing Results

All systems tested and verified working:
- ✅ Save unanswered question to database
- ✅ Retrieve pending questions
- ✅ Mark questions as answered
- ✅ API endpoints working correctly
- ✅ Bot still responding to known questions

## 📊 Database

New table created in `data/bookings.db`:
```sql
CREATE TABLE unanswered_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  question TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',
  staff_response TEXT,
  response_timestamp DATETIME
)
```

## 🚀 How to Use

### For Users
- Just ask a question normally on WhatsApp
- If the bot doesn't know, you'll get a polite message asking you to wait
- Staff will review and get back to you

### For Staff (via API)

**View pending questions:**
```bash
curl http://localhost:3000/api/unanswered-questions/pending
```

**Respond to a question:**
```bash
curl -X POST http://localhost:3000/api/unanswered-questions/1/respond \
  -H "Content-Type: application/json" \
  -d '{"response": "Your answer here"}'
```

### For Developers (Dashboard Integration)

Add a "Customer Questions" section to your dashboard:
```javascript
// Get pending questions
fetch('/api/unanswered-questions/pending')
  .then(r => r.json())
  .then(questions => displayQuestions(questions))

// Submit response
fetch('/api/unanswered-questions/3/respond', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ response: 'Our answer' })
})
```

## 🔮 Future Enhancements

- [ ] Send staff response back to user via WhatsApp
- [ ] Email notifications for new unanswered questions
- [ ] Dashboard UI for managing questions in admin panel
- [ ] AI suggestions for common questions
- [ ] Analytics on frequently asked unanswered questions

## 📝 Documentation

See [UNANSWERED_QUESTIONS.md](./UNANSWERED_QUESTIONS.md) for full API documentation.
