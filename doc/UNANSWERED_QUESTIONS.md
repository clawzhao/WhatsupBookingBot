# Unanswered Questions Management

This system automatically captures questions that the chatbot cannot answer and lets your staff respond to them.

## How It Works

1. **Automatic Detection**: When a user asks a question that the bot doesn't know, instead of saying "I don't know", the bot:
   - Saves the question to the database
   - Sends a polite message to the user: *"Thank you for your question! I don't have the answer right now, but let me check and get back to you soon. Our team will review your question and respond as soon as possible."*

2. **Staff Dashboard**: Staff can view pending questions through the REST API

3. **Staff Response**: Staff can respond to questions through the API, which marks them as answered

## API Endpoints

### View All Unanswered Questions (Paginated)
**GET** `/api/unanswered-questions?limit=50&offset=0`

Response:
```json
[
  {
    "id": 1,
    "phone": "1234567890@c.us",
    "question": "Do you have vegan options?",
    "timestamp": "2026-03-14T10:30:45.000Z",
    "status": "pending",
    "staff_response": null,
    "response_timestamp": null
  }
]
```

### View Only Pending Questions
**GET** `/api/unanswered-questions/pending`

Returns only questions with `status = 'pending'`

### Respond to a Question
**POST** `/api/unanswered-questions/:id/respond`

Request body:
```json
{
  "response": "Yes, we have several vegan options! Our vegan menu includes..."
}
```

Response:
```json
{
  "success": true,
  "message": "Question marked as answered"
}
```

## Using with Dashboard

You can integrate this into your admin dashboard (`public/` folder) by:

1. Creating a "Pending Questions" tab next to "View Bookings"
2. Fetching questions from `/api/unanswered-questions/pending`
3. Displaying them in a table with a "Respond" button
4. When staff clicks "Respond", collect their message and POST to `/api/unanswered-questions/:id/respond`

## Example Usage

```bash
# Get pending questions
curl http://localhost:3000/api/unanswered-questions/pending

# Respond to question #1
curl -X POST http://localhost:3000/api/unanswered-questions/1/respond \
  -H "Content-Type: application/json" \
  -d '{"response": "Yes, we have vegan options available!"}'
```

## Future Enhancements

- [ ] Automatically send staff response back to the user via WhatsApp
- [ ] Email notifications when new questions arrive
- [ ] Suggested responses based on chatbot knowledge base
- [ ] Analytics dashboard showing common unanswered questions

