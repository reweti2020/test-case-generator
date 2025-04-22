//  This is a partial update for the main.js file
// Update the fetch URL to use the correct API endpoints

// Replace this in handleFormSubmit function:
/*
const response = await fetch('/api/generate-incremental', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: url,
    mode: 'first',
    format: elements.formatSelect.value
  }),
  signal: controller.signal
});
*/

// With this:
const response = await fetch('/api/generate-incremental.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: url,
    mode: 'first',
    format: elements.formatSelect.value
  }),
  signal: controller.signal
});

// And similarly replace:
/*
const response = await fetch('/api/generate-incremental', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'next',
    sessionId: state.sessionId,
    elementType: state.nextElementType,
    elementIndex: state.nextElementIndex,
    format: elements.formatSelect.value
  })
});
*/

// With this:
const response = await fetch('/api/generate-incremental.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'next',
    sessionId: state.sessionId,
    elementType: state.nextElementType,
    elementIndex: state.nextElementIndex,
    format: elements.formatSelect.value
  })
});

// Replace in handleDownload function:
/*
const response = await fetch('/api/export-tests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: state.sessionId,
    format: format
  })
});
*/

// With this:
const response = await fetch('/api/export-test.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: state.sessionId,
    format: format
  })
});

// Replace in handleUpgrade function:
/*
const response = await fetch('/api/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ plan: planType })
});
*/

// With this:
const response = await fetch('/api/create-checkout-session.js', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ plan: planType })
});
