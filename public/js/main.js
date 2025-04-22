/**
 * Main JavaScript file for Test Case Generator
 */
document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements with null checks
  const elements = {
    urlForm: document.getElementById('url-form'),
    urlInput: document.getElementById('url-input'),
    formatSelect: document.getElementById('format-select'),
    generateButton: document.getElementById('generate-button'),
    output: document.getElementById('output'),
    nextTestContainer: document.getElementById('next-test-container'),
    generateNextTest: document.getElementById('generate-next-test'),
    elementInfo: document.getElementById('element-info'),
    upgradeModal: document.getElementById('upgrade-modal'),
    upgradeBanner: document.getElementById('upgrade-banner'),
    showUpgradeModal: document.getElementById('show-upgrade-modal'),
    confirmUpgrade: document.getElementById('confirm-upgrade'),
    closeUpgradeModal: document.getElementById('close-upgrade-modal'),
    downloadContainer: document.getElementById('download-container'),
    planOptions: document.querySelectorAll('.plan-option'),
    testCaseList: document.getElementById('test-case-list'),
    loadingSpinner: document.getElementById('loading-spinner'),
    testCaseCounter: document.getElementById('test-case-counter')
  };
  
  // Application state
  const state = {
    sessionId: null,
    nextElementType: null,
    nextElementIndex: 0,
    hasMoreElements: false,
    testCases: [],
    totalTestCases: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 5,
    userPlan: 'free', // Default to free plan
    freeLimit: 10, // Maximum test cases for free plan
    currentUrl: '',
    isLoading: false
  };
  
  // Initialize the app
  initApp();
  
  /**
   * Initialize the application
   */
  function initApp() {
    // Check if user is logged in with premium plan
    checkUserPlan();
    
    // Add event listeners
    addEventListeners();
    
    // Update UI based on user plan
    updateUiForUserPlan();
  }
  
  /**
   * Check user's current plan
   */
  function checkUserPlan() {
    // Check localStorage for saved plan
    const savedPlan = localStorage.getItem('userPlan');
    if (savedPlan) {
      state.userPlan = savedPlan;
    }
  }
  
  /**
   * Setup event listeners
   */
  function addEventListeners() {
    // Generate button click
    if (elements.urlForm) {
      elements.urlForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Generate next test
    if (elements.generateNextTest) {
      elements.generateNextTest.addEventListener('click', handleGenerateNextTest);
    }
    
    // Upgrade modal
    if (elements.showUpgradeModal) {
      elements.showUpgradeModal.addEventListener('click', () => {
        // Track upgrade click
        trackEvent('upgrade_click', 'engagement', 'upgrade_banner');
        if (elements.upgradeModal) {
          elements.upgradeModal.style.display = 'flex';
        }
      });
    }
    
    // Close upgrade modal
    if (elements.closeUpgradeModal) {
      elements.closeUpgradeModal.addEventListener('click', () => {
        if (elements.upgradeModal) {
          elements.upgradeModal.style.display = 'none';
        }
      });
    }
    
    // Confirm upgrade
    if (elements.confirmUpgrade) {
      elements.confirmUpgrade.addEventListener('click', handleUpgrade);
    }
    
    // Plan selection
    if (elements.planOptions && elements.planOptions.length > 0) {
      elements.planOptions.forEach(plan => {
        plan.addEventListener('click', () => {
          elements.planOptions.forEach(p => p.classList.remove('selected'));
          plan.classList.add('selected');
        });
      });
    }
    
    // Add download buttons event listeners
    addDownloadEventListeners();
  }
  
  /**
   * Update UI elements based on user plan
   */
  function updateUiForUserPlan() {
    // Exit early if formatSelect doesn't exist
    if (!elements.formatSelect) return;
    
    // Update format options
    const katalon = elements.formatSelect.querySelector('option[value="katalon"]');
    const maestro = elements.formatSelect.querySelector('option[value="maestro"]');
    const html = elements.formatSelect.querySelector('option[value="html"]');
    const csv = elements.formatSelect.querySelector('option[value="csv"]');
    
    if (state.userPlan === 'free') {
      // Disable premium formats but keep them visible
      if (katalon) katalon.enabled = true;
      if (maestro) maestro.enabled = true;
      if (html) html.enabled = true;
      if (csv) csv.enabled = true;
      
      // Add premium labels
      const premiumFormats = [katalon, maestro, html, csv].filter(el => el);
      premiumFormats.forEach(format => {
        if (format && !format.textContent.includes('(Pro)')) {
          format.textContent += ' (Pro)';
        }
      });
    }
  }
  
  /**
   * Handle form submission
   * @param {Event} e - Submit event
   */
  async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!elements.urlInput || !elements.output) return;
    
    // Reset session state
    state.sessionId = null;
    state.testCases = [];
    state.totalTestCases = 0;
    
    if (elements.nextTestContainer) {
      elements.nextTestContainer.style.display = 'none';
    }
    
    // Get and validate URL
    const url = elements.urlInput.value.trim();
    if (!url) {
      showError('Please enter a valid URL');
      return;
    }
    
    state.currentUrl = url;
    
    // Show loading state
    setLoading(true);
    elements.output.innerHTML = '<p>Analyzing website...</p>';
    
    try {
      // Add a client-side timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
      
      // Ensure we have formatSelect
      const format = elements.formatSelect ? elements.formatSelect.value : 'plain';
      
      const response = await fetch('/api/generate-incremental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          mode: 'first',
          format: format
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Store session info
        state.sessionId = data.sessionId;
        state.nextElementType = data.nextElementType;
        state.nextElementIndex = data.nextElementIndex;
        state.hasMoreElements = data.hasMoreElements;
        state.testCases = state.testCases.concat(data.testCases || []);
        state.totalTestCases = data.totalTestCases || (data.testCases ? data.testCases.length : 0);
        
        // Track successful generation
        trackEvent('generate_test_cases', 'usage', url);
        
        // Render test cases
        if (data.testCases && data.testCases.length > 0) {
          renderTestCases(data.testCases);
        } else {
          elements.output.innerHTML = '<p>No test cases were generated. Try a different URL.</p>';
        }
        
        // Show "Generate Next Test" button if more elements are available
        if (data.hasMoreElements && elements.nextTestContainer) {
          elements.nextTestContainer.style.display = 'block';
          updateElementInfo();
        }
        
        // Show download container
        if (elements.downloadContainer && state.testCases.length > 0) {
          elements.downloadContainer.style.display = 'block';
        }
        
        // Show upgrade banner if free limit reached
        if (data.upgradeRequired && elements.upgradeBanner) {
          elements.upgradeBanner.classList.remove('hidden');
        }
      } else {
        showError(`Error: ${data.error || 'Unknown error occurred'}`);
        
        // Show upgrade prompt if needed
        if (data.upgradeRequired && elements.upgradeBanner) {
          elements.upgradeBanner.classList.remove('hidden');
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        showError('Request timed out. Please try a simpler website.');
      } else {
        showError(`Error: ${error.message || 'Unknown error occurred'}`);
      }
    } finally {
      setLoading(false);
    }
  }
  
  /**
   * Handle "Generate Next Test" button click
   */
  async function handleGenerateNextTest() {
    if (!state.sessionId || !state.hasMoreElements || !elements.output) return;
    
    // Check free plan limits
    if (state.userPlan === 'free' && state.totalTestCases >= state.freeLimit) {
      if (elements.upgradeBanner) {
        elements.upgradeBanner.classList.remove('hidden');
      }
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    try {
      // Ensure we have formatSelect
      const format = elements.formatSelect ? elements.formatSelect.value : 'plain';
      
      const response = await fetch('/api/generate-incremental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'next',
          sessionId: state.sessionId,
          elementType: state.nextElementType,
          elementIndex: state.nextElementIndex,
          format: format
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update state
        state.nextElementType = data.nextElementType;
        state.nextElementIndex = data.nextElementIndex;
        state.hasMoreElements = data.hasMoreElements;
        state.testCases = state.testCases.concat(data.testCases || []);
        state.totalTestCases = data.totalTestCases || state.testCases.length;
        
        // Render new test cases
        if (data.testCases && data.testCases.length > 0) {
          renderTestCases(data.testCases, true);
        }
        
        // Update element info
        updateElementInfo();
        
        // Hide "Generate Next Test" button if no more elements
        if (!data.hasMoreElements && elements.nextTestContainer) {
          elements.nextTestContainer.style.display = 'none';
        }
        
        // Show upgrade banner if free limit reached
        if (data.upgradeRequired && elements.upgradeBanner) {
          elements.upgradeBanner.classList.remove('hidden');
          if (elements.nextTestContainer) {
            elements.nextTestContainer.style.display = 'none';
          }
        }
      } else {
        showError(`Error: ${data.error || 'Unknown error occurred'}`);
        
        // Show upgrade prompt if needed
        if (data.upgradeRequired && elements.upgradeBanner) {
          elements.upgradeBanner.classList.remove('hidden');
          if (elements.nextTestContainer) {
            elements.nextTestContainer.style.display = 'none';
          }
        }
      }
    } catch (error) {
      showError(`Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  }
  
  /**
   * Handle upgrade button click
   */
  async function handleUpgrade() {
    const selectedPlan = document.querySelector('.plan-option.selected');
    if (!selectedPlan || !elements.confirmUpgrade) return;
    
    const planType = selectedPlan.getAttribute('data-plan');
    if (!planType) return;
    
    if (planType === 'enterprise') {
      window.open('mailto:sales@example.com?subject=Enterprise Plan Inquiry', '_blank');
      if (elements.upgradeModal) {
        elements.upgradeModal.style.display = 'none';
      }
      return;
    }
    
    // Track conversion event
    trackEvent('upgrade_confirmed', 'conversion', planType);
    
    // Show loading state in the button
    elements.confirmUpgrade.textContent = 'Processing...';
    elements.confirmUpgrade.disabled = true;
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: planType })
      });
      
      const session = await response.json();
      
      if (session.success && session.id) {
        // In a real implementation, you would redirect to Stripe checkout
        // For this demo, we'll simulate a successful upgrade
        simulateSuccessfulUpgrade(planType);
      } else {
        throw new Error(session.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Payment processing error: ' + (error.message || 'Unknown error'));
      
      // Reset button
      elements.confirmUpgrade.textContent = 'Upgrade Now';
      elements.confirmUpgrade.disabled = false;
    }
  }
  
  /**
   * Simulate a successful upgrade (for demo purposes)
   * @param {String} planType - The plan type
   */
  function simulateSuccessfulUpgrade(planType) {
    if (!elements.output) return;
    
    // Update user plan
    state.userPlan = planType;
    localStorage.setItem('userPlan', planType);
    
    // Hide upgrade elements
    if (elements.upgradeBanner) {
      elements.upgradeBanner.classList.add('hidden');
    }
    if (elements.upgradeModal) {
      elements.upgradeModal.style.display = 'none';
    }
    
    // Enable premium formats
    if (elements.formatSelect) {
      const formatSelect = elements.formatSelect;
      for (let i = 0; i < formatSelect.options.length; i++) {
        formatSelect.options[i].disabled = false;
        
        // Remove Pro label
        const option = formatSelect.options[i];
        option.textContent = option.textContent.replace(' (Pro)', '');
      }
    }
    
    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'upgrade-success-banner';
    successMessage.innerHTML = `
      <p>🎉 Congratulations! You've successfully upgraded to the ${planType.charAt(0).toUpperCase() + planType.slice(1)} plan.</p>
      <p>You now have access to all premium features!</p>
    `;
    
    const container = document.querySelector('.container');
    if (container) {
      container.insertBefore(successMessage, elements.output.parentNode);
    } else {
      document.body.insertBefore(successMessage, elements.output.parentNode);
    }
    
    // Enable "Generate Next Test" button if it was hidden
    if (elements.nextTestContainer && state.hasMoreElements) {
      elements.nextTestContainer.style.display = 'block';
    }
    
    // Remove success message after 5 seconds
    setTimeout(() => {
      if (successMessage.parentNode) {
        successMessage.parentNode.removeChild(successMessage);
      }
    }, 5000);
  }
  
  /**
   * Render test cases in the output area
   * @param {Array} testCases - Test cases to render
   * @param {Boolean} append - Whether to append or replace existing content
   */
  function renderTestCases(testCases, append = false) {
    if (!testCases || testCases.length === 0 || !elements.output) return;
    
    // Clear output or create list container if not appending
    if (!append) {
      elements.output.innerHTML = '';
      
      const existingList = document.getElementById('test-case-list');
      if (!existingList) {
        const newList = document.createElement('div');
        newList.id = 'test-case-list';
        elements.output.appendChild(newList);
      }
    }
    
    // Get or create test case list
    const testCaseList = document.getElementById('test-case-list') || elements.output;
    
    // Add test cases
    testCases.forEach(testCase => {
      if (!testCase) return; // Skip undefined test cases
      
      const testCaseElement = document.createElement('div');
      testCaseElement.className = 'test-case';
      testCaseElement.setAttribute('data-id', testCase.id || 'unknown');
      
      // Build HTML content
      let content = `
        <div class="test-case-header">
          <h3>${testCase.title || 'Untitled Test Case'}</h3>
          <span class="priority priority-${testCase.priority || 'Medium'}">${testCase.priority || 'Medium'}</span>
        </div>
        <p>${testCase.description || 'No description provided'}</p>
        <div class="test-steps">
          <h4>Test Steps:</h4>
          <ol>
      `;
      
      // Add steps
      if (testCase.steps && testCase.steps.length > 0) {
        testCase.steps.forEach(step => {
          if (!step) return; // Skip undefined steps
          
          content += `
            <li>
              <div class="step-content">
                <p><strong>Action:</strong> ${step.action || 'No action specified'}</p>
                <p><strong>Expected:</strong> ${step.expected || 'No expected result specified'}</p>
              </div>
            </li>
          `;
        });
      } else {
        content += `
          <li>
            <div class="step-content">
              <p>No steps defined for this test case</p>
            </div>
          </li>
        `;
      }
      
      content += `
          </ol>
        </div>
      `;
      
      testCaseElement.innerHTML = content;
      testCaseList.appendChild(testCaseElement);
    });
    
    // Update test case counter
    if (elements.testCaseCounter) {
      elements.testCaseCounter.textContent = `Showing ${state.testCases.length} test case${state.testCases.length !== 1 ? 's' : ''}`;
      
      // Add limit info for free users
      if (state.userPlan === 'free') {
        elements.testCaseCounter.textContent += ` (${state.testCases.length}/${state.freeLimit})`;
      }
    }
  }
  
  /**
   * Update element info text
   */
  function updateElementInfo() {
    if (!elements.elementInfo || !state.nextElementType) return;
    
    const elementTypes = {
      button: 'Button',
      form: 'Form',
      link: 'Link',
      input: 'Input Field'
    };
    
    const elementType = elementTypes[state.nextElementType] || 'Element';
    elements.elementInfo.textContent = `Next element: ${elementType} #${state.nextElementIndex + 1}`;
  }
  
  /**
   * Add event listeners for download buttons
   */
  function addDownloadEventListeners() {
    const downloadButtons = [
      { id: 'download-txt', format: 'txt' },
      { id: 'download-json', format: 'json' },
      { id: 'download-csv', format: 'csv' },
      { id: 'download-html', format: 'html' },
      { id: 'download-katalon', format: 'katalon' },
      { id: 'download-maestro', format: 'maestro' }
    ];
    
    downloadButtons.forEach(button => {
      const element = document.getElementById(button.id);
      if (element) {
        element.addEventListener('click', () => handleDownload(button.format));
      }
    });
  }
  
  /**
   * Handle download request
   * @param {String} format - Export format
   */
  async function handleDownload(format) {
    if (!state.sessionId || !state.testCases || state.testCases.length === 0) {
      showError('No test cases to download');
      return;
    }
    
    // Premium format check
    const premiumFormats = ['katalon', 'maestro', 'testrail', 'csv', 'html'];
    if (state.userPlan === 'free' && premiumFormats.includes(format)) {
      if (elements.upgradeBanner) {
        elements.upgradeBanner.classList.remove('hidden');
      }
      showError(`${format.toUpperCase()} export is a Pro feature`);
      return;
    }
    
    // Track download event
    trackEvent('download_test_cases', 'usage', format);
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/export-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          format: format
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Trigger download
        downloadFile(data.exportData, data.filename, data.contentType);
      } else {
        showError(`Export error: ${data.error || 'Unknown error'}`);
        
        // Show upgrade banner if needed
        if (data.upgradeRequired && elements.upgradeBanner) {
          elements.upgradeBanner.classList.remove('hidden');
        }
      }
    } catch (error) {
      showError(`Download error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }
  
  /**
   * Download file helper
   * @param {String} content - File content
   * @param {String} filename - File name
   * @param {String} contentType - Content type
   */
  function downloadFile(content, filename, contentType) {
    if (!content) {
      showError('No content to download');
      return;
    }
    
    const blob = new Blob([content], { type: contentType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download.txt';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  /**
   * Show error message
   * @param {String} message - Error message
   */
  function showError(message) {
    if (!elements.output) return;
    elements.output.innerHTML = `<p class="error">❌ ${message}</p>`;
  }
  
  /**
   * Set loading state
   * @param {Boolean} isLoading - Whether loading is active
   */
  function setLoading(isLoading) {
    state.isLoading = isLoading;
    
    if (elements.loadingSpinner) {
      elements.loadingSpinner.style.display = isLoading ? 'block' : 'none';
    }
    
    if (elements.generateButton) {
      elements.generateButton.disabled = isLoading;
      elements.generateButton.innerHTML = isLoading ? 
        '<span class="spinner-small"></span> Generating...' : 
        'Generate Test Cases';
    }
    
    if (elements.generateNextTest) {
      elements.generateNextTest.disabled = isLoading;
    }
  }
  
  /**
   * Track analytics event
   * @param {String} event - Event name
   * @param {String} category - Event category
   * @param {String} label - Event label
   */
  function trackEvent(event, category, label) {
    // Google Analytics tracking
    if (window.gtag) {
      gtag('event', event, {
        'event_category': category,
        'event_label': label
      });
    }
    
    // You can also implement your own analytics here
    console.log(`Analytics: ${event}, ${category}, ${label}`);
  }
});
