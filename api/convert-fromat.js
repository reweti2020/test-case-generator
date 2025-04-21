// In your frontend code
const fetchTestCases = async () => {
  try {
    // Show loading state
    elements.output.innerHTML = '<div class="spinner"></div>';
    
    // Set a longer timeout for the fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
    
    const response = await fetch('/api/generate-tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: state.currentUrl,
        format: 'plain' // Always request plain format first
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Store the data
      state.testData = data;
      
      // Always render in plain text first
      renderTestCases(data);
      
      // Show format conversion options
      showFormatOptions();
      
      // Show download options
      elements.downloadContainer.classList.remove('hidden');
    } else {
      elements.output.innerHTML = `<p>❌ Error: ${data.error}</p>`;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      elements.output.innerHTML = `
        <p>⚠️ The request took too long. Here are some generic test cases for your URL:</p>
        <div id="fallback-test-cases"></div>
        <button id="retry-with-basic" class="button-secondary">Retry with Basic Mode</button>
      `;
      
      // Generate fallback test cases client-side
      const fallbackCases = generateClientSideFallbackTests(state.currentUrl);
      renderFallbackTestCases(fallbackCases);
      
      // Add retry button handler
      document.getElementById('retry-with-basic').addEventListener('click', () => {
        fetchTestCasesBasicMode();
      });
    } else {
      elements.output.innerHTML = `<p>❌ Error: ${error.message}</p>`;
    }
  }
};

// Fallback function for timeout cases
const fetchTestCasesBasicMode = async () => {
  try {
    elements.output.innerHTML = '<div class="spinner"></div>';
    
    const response = await fetch('/api/generate-basic-tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: state.currentUrl
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      state.testData = data;
      renderTestCases(data);
      showFormatOptions();
      elements.downloadContainer.classList.remove('hidden');
    } else {
      elements.output.innerHTML = `<p>❌ Error: ${data.error}</p>`;
    }
  } catch (error) {
    elements.output.innerHTML = `<p>❌ Error: ${error.message}</p>`;
  }
};

// Show format conversion options
const showFormatOptions = () => {
  const formatOptions = document.createElement('div');
  formatOptions.className = 'format-options';
  formatOptions.innerHTML = `
    <h3>Convert to Format:</h3>
    <div class="button-group">
      <button class="format-btn selected" data-format="plain">Plain Text</button>
      <button class="format-btn" data-format="katalon">Katalon</button>
      <button class="format-btn" data-format="maestro">Maestro</button>
    </div>
  `;
  
  // Add event listeners to buttons
  formatOptions.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove selected class from all buttons
      formatOptions.querySelectorAll('.format-btn').forEach(b => b.classList.remove('selected'));
      // Add selected class to clicked button
      btn.classList.add('selected');
      
      const format = btn.getAttribute('data-format');
      convertFormat(format);
    });
  });
  
  // Add to UI
  elements.output.insertAdjacentElement('beforebegin', formatOptions);
};

// Convert to different formats client-side
const convertFormat = async (format) => {
  if (!state.testData || format === 'plain') {
    // Plain format is already rendered
    return;
  }
  
  try {
    // Show loading state
    const oldContent = elements.output.innerHTML;
    elements.output.innerHTML = '<div class="spinner"></div>';
    
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
      renderFormattedTestCases(data.convertedTestCases, format);
    } else {
      // Revert to previous content on error
      elements.output.innerHTML = oldContent;
      alert(`Error converting to ${format} format: ${data.error}`);
    }
  } catch (error) {
    elements.output.innerHTML = `<p>❌ Error converting format: ${error.message}</p>`;
  }
};
