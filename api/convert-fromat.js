// api/convert-format.js
module.exports = async (req, res) => {
  const { testCases, format, pageData } = req.body;
  
  if (!testCases || !format) {
    return res.status(400).json({ success: false, error: 'Test cases and format are required' });
  }
  
  let formattedOutput;
  
  if (format === 'katalon') {
    formattedOutput = formatKatalonTestCases(pageData, testCases);
  } else if (format === 'maestro') {
    formattedOutput = formatMaestroTestCases(pageData, testCases);
  } else {
    formattedOutput = testCases; // Default to plain text
  }
  
  return res.status(200).json({
    success: true,
    convertedTestCases: formattedOutput
  });
};
// In your frontend code
const convertFormat = async (format) => {
  if (!state.testData) return;
  
  elements.output.innerHTML = '<div class="spinner"></div>';
  
  try {
    const response = await fetch('/api/convert-format', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testCases: state.testData.testCases,
        pageData: state.testData.pageData,
        format: format
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update display with converted format
      state.currentFormat = format;
      renderTestCases({
        ...state.testData,
        testCases: data.convertedTestCases
      });
    } else {
      console.error('Format conversion failed:', data.error);
    }
  } catch (error) {
    console.error('Error converting format:', error);
  }
};

// Add this to your UI
function addFormatButtons() {
  const formatButtons = document.createElement('div');
  formatButtons.className = 'format-buttons';
  formatButtons.innerHTML = `
    <h3>Convert to Format:</h3>
    <div class="button-group">
      <button class="format-btn" data-format="plain">Plain Text</button>
      <button class="format-btn" data-format="katalon">Katalon</button>
      <button class="format-btn" data-format="maestro">Maestro</button>
    </div>
  `;
  
  // Add event listeners to buttons
  formatButtons.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.getAttribute('data-format');
      convertFormat(format);
    });
  });
  
  // Add to UI after test cases are shown
  document.getElementById('test-results').appendChild(formatButtons);
}
