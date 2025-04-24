/**
 * Main JavaScript file for Test Case Generator
 */
document.addEventListener("DOMContentLoaded", () => {
  // Add promotional banner
  const promoHTML = `
  <div id="promo-banner" class="promo-banner">
    <div class="promo-content">
      <div class="promo-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="promo-icon">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
        <span class="promo-tag">LIMITED TIME OFFER</span>
      </div>
      <p>All Pro features are currently available for free during our launch period!</p>
    </div>
    <button id="close-promo" class="close-promo" aria-label="Close promotion banner">×</button>
  </div>
  `

  // Insert promo banner at the top of the page
  const container = document.querySelector(".container")
  if (container) {
    container.insertAdjacentHTML("beforebegin", promoHTML)
  }

  // Get DOM elements with null checks
  const elements = {
    urlForm: document.getElementById("url-form"),
    urlInput: document.getElementById("url-input"),
    formatSelect: document.getElementById("format-select"),
    generateButton: document.getElementById("generate-button"),
    output: document.getElementById("output"),
    nextTestContainer: document.getElementById("next-test-container"),
    generateNextTest: document.getElementById("generate-next-test"),
    elementInfo: document.getElementById("element-info"),
    upgradeModal: document.getElementById("upgrade-modal"),
    upgradeBanner: document.getElementById("upgrade-banner"),
    showUpgradeModal: document.getElementById("show-upgrade-modal"),
    confirmUpgrade: document.getElementById("confirm-upgrade"),
    closeUpgradeModal: document.getElementById("close-upgrade-modal"),
    downloadContainer: document.getElementById("download-container"),
    planOptions: document.querySelectorAll(".plan-option"),
    testCaseList: document.getElementById("test-case-list"),
    loadingSpinner: document.getElementById("loading-spinner"),
    testCaseCounter: document.getElementById("test-case-counter"),
    promoBanner: document.getElementById("promo-banner"),
    closePromo: document.getElementById("close-promo"),
    correctionUI: document.getElementById("correction-ui"),
    debugSection: document.getElementById("debug-section"),
    debugMode: document.getElementById("debug-mode"),
    debugSelector: document.getElementById("debug-selector"),
    runDebug: document.getElementById("run-debug"),
    debugResults: document.getElementById("debug-results"),
  }

  // Application state
  const state = {
    sessionId: null, // Store session ID for API calls
    pageData: null, // Store all page data from server
    processed: null, // Store processing state
    nextElementType: null,
    nextElementIndex: 0,
    hasMoreElements: false,
    testCases: [],
    totalTestCases: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 5,
    userPlan: "pro", // Force pro plan for testing
    freeLimit: 9999, // Very high limit for testing
    currentUrl: "",
    isLoading: false,
  }

  // Initialize the app
  initApp()

  /**
   * Initialize the application
   */
  function initApp() {
    // Persist pro plan for testing
    localStorage.setItem("userPlan", "pro")
    console.log("Pro plan enabled for testing")

    // Add event listeners
    addEventListeners()

    // Update UI based on user plan
    updateUiForUserPlan()

    // Initialize correction UI
    initCorrectionUI()

    // Initialize debug tools
    initDebugTools()

    // Update button text for batch generation
    if (elements.generateNextTest) {
      elements.generateNextTest.textContent = "Generate 5 More Tests"
    }

    // Handle promo banner close
    if (elements.closePromo) {
      elements.closePromo.addEventListener("click", () => {
        if (elements.promoBanner) {
          elements.promoBanner.style.display = "none"
          localStorage.setItem("promoHidden", "true")
        }
      })
    }

    // Check if user has previously closed the banner
    if (elements.promoBanner && localStorage.getItem("promoHidden") === "true") {
      elements.promoBanner.style.display = "none"
    }
  }

  /**
   * Setup event listeners
   */
  function addEventListeners() {
    // Generate button click
    if (elements.urlForm) {
      elements.urlForm.addEventListener("submit", handleFormSubmit)
    }

    // Generate next test
    if (elements.generateNextTest) {
      elements.generateNextTest.addEventListener("click", handleGenerateNextTest)
    }

    // Upgrade modal
    if (elements.showUpgradeModal) {
      elements.showUpgradeModal.addEventListener("click", () => {
        // Track upgrade click
        trackEvent("upgrade_click", "engagement", "upgrade_banner")
        if (elements.upgradeModal) {
          elements.upgradeModal.style.display = "flex"
        }
      })
    }

    // Close upgrade modal
    if (elements.closeUpgradeModal) {
      elements.closeUpgradeModal.addEventListener("click", () => {
        if (elements.upgradeModal) {
          elements.upgradeModal.style.display = "none"
        }
      })
    }

    // Confirm upgrade
    if (elements.confirmUpgrade) {
      elements.confirmUpgrade.addEventListener("click", handleUpgrade)
    }

    // Plan selection
    if (elements.planOptions && elements.planOptions.length > 0) {
      elements.planOptions.forEach((plan) => {
        plan.addEventListener("click", () => {
          elements.planOptions.forEach((p) => p.classList.remove("selected"))
          plan.classList.add("selected")
        })
      })
    }

    // Add download buttons event listeners
    addDownloadEventListeners()
  }

  /**
   * Initialize debug tools
   */
  function initDebugTools() {
    if (elements.debugMode) {
      elements.debugMode.addEventListener("change", function () {
        if (elements.debugSection) {
          elements.debugSection.style.display = this.checked ? "block" : "none"
        }
      })
    }

    if (elements.runDebug) {
      elements.runDebug.addEventListener("click", async () => {
        if (!elements.debugResults || !elements.debugSelector) return

        // Get URL from state
        const url = state.currentUrl
        if (!url) {
          elements.debugResults.innerHTML = '<p class="error">❌ Please enter a URL in the main form first</p>'
          return
        }

        // Show loading state
        elements.debugResults.innerHTML = '<div class="spinner"></div><p>Analyzing elements...</p>'

        try {
          const response = await fetch("/api/debug-element", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: url,
              selector: elements.debugSelector.value.trim(),
            }),
          })

          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`)
          }

          const data = await response.json()

          if (data.success) {
            let resultsHTML = `<p>Found ${data.results.length} element(s) matching "${data.selector}" on ${data.url}</p><pre>`
            data.results.forEach((element, index) => {
              resultsHTML += `\n[${index}] ${element.tagName}: ${element.content || "No content"}\n`
              resultsHTML += `    Attributes: ${JSON.stringify(element.attributes, null, 2)}\n`
            })
            resultsHTML += "</pre>"

            elements.debugResults.innerHTML = resultsHTML
          } else {
            elements.debugResults.innerHTML = `<p class="error">❌ ${data.error || "Unknown error"}</p>`
          }
        } catch (error) {
          elements.debugResults.innerHTML = `<p class="error">❌ Debug API error: ${error.message || "Unknown error"}</p>`
        }
      })
    }
  }

  /**
   * Update UI elements based on user plan
   */
  function updateUiForUserPlan() {
    // Exit early if formatSelect doesn't exist
    if (!elements.formatSelect) return

    // For testing, enable all formats regardless of plan
    const formatOptions = elements.formatSelect.querySelectorAll("option")
    formatOptions.forEach((option) => {
      option.disabled = false
      // Remove any (Pro) labels
      option.textContent = option.textContent.replace(" (Pro)", "")
    })

    // Hide upgrade banner if it exists
    if (elements.upgradeBanner) {
      elements.upgradeBanner.classList.add("hidden")
    }
  }

  /**
   * Handle form submission
   * @param {Event} e - Submit event
   */
  async function handleFormSubmit(e) {
    e.preventDefault()

    if (!elements.urlInput || !elements.output) return

    // Reset session state
    state.sessionId = null
    state.pageData = null
    state.processed = null
    state.testCases = []
    state.totalTestCases = 0

    if (elements.nextTestContainer) {
      elements.nextTestContainer.style.display = "none"
    }

    // Get and validate URL
    const url = elements.urlInput.value.trim()
    if (!url) {
      showError("Please enter a valid URL")
      return
    }

    state.currentUrl = url

    // Show loading state
    setLoading(true)
    elements.output.innerHTML = "<p>Analyzing website...</p>"

    try {
      // Add a client-side timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 second timeout

      // Ensure we have formatSelect
      const format = elements.formatSelect ? elements.formatSelect.value : "plain"

      const response = await fetch("/api/generate-incremental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url,
          mode: "first",
          format: format,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Store session ID for future requests
        state.sessionId = data.sessionId

        // Store complete data returned from server
        state.pageData = data.pageData
        state.processed = data.processed
        state.nextElementType = data.nextElementType
        state.nextElementIndex = data.nextElementIndex
        state.hasMoreElements = data.hasMoreElements
        state.testCases = state.testCases.concat(data.testCases || [])
        state.totalTestCases = data.totalTestCases || (data.testCases ? data.testCases.length : 0)

        // Apply any stored corrections
        state.testCases = applyStoredCorrections(state.testCases)

        // Track successful generation
        trackEvent("generate_test_cases", "usage", url)

        // Render test cases
        if (data.testCases && data.testCases.length > 0) {
          renderTestCases(data.testCases)
        } else {
          elements.output.innerHTML = "<p>No test cases were generated. Try a different URL.</p>"
        }

        // Show "Generate Next Test" button if more elements are available
        if (data.hasMoreElements && elements.nextTestContainer) {
          elements.nextTestContainer.style.display = "block"
          updateElementInfo()
        }

        // Show download container
        if (elements.downloadContainer && state.testCases.length > 0) {
          elements.downloadContainer.style.display = "block"
        }

        // Show promotional message instead of upgrade banner
        if (data.upgradeRequired && elements.upgradeBanner) {
          showPromotionalBanner()
        }
      } else {
        showError(`Error: ${data.error || "Unknown error occurred"}`)

        // Show promo message instead of upgrade banner
        if (data.upgradeRequired && elements.upgradeBanner) {
          showPromotionalBanner()
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        showError("Request timed out. Please try a simpler website.")
      } else {
        showError(`Error: ${error.message || "Unknown error occurred"}`)
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle "Generate Next Test" button click
   */
  async function handleGenerateNextTest() {
    if (!state.hasMoreElements || !state.sessionId) {
      showError("No more elements to test or missing session ID")
      return
    }

    // Show loading state
    setLoading(true)

    try {
      // Ensure we have formatSelect
      const format = elements.formatSelect ? elements.formatSelect.value : "plain"

      const response = await fetch("/api/generate-incremental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "next",
          sessionId: state.sessionId, // Use sessionId for state tracking
          elementType: state.nextElementType,
          elementIndex: state.nextElementIndex,
          format: format,
          batchSize: 5, // Request 5 tests at once
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Update state with received data
        state.pageData = data.pageData || state.pageData
        state.processed = data.processed || state.processed
        state.nextElementType = data.nextElementType
        state.nextElementIndex = data.nextElementIndex
        state.hasMoreElements = data.hasMoreElements
        state.testCases = state.testCases.concat(data.testCases || [])
        state.totalTestCases = data.totalTestCases || state.testCases.length

        // Apply any stored corrections
        state.testCases = applyStoredCorrections(state.testCases)

        // Render new test cases
        if (data.testCases && data.testCases.length > 0) {
          renderTestCases(data.testCases, true)
        }

        // Update element info
        updateElementInfo()

        // Hide "Generate Next Test" button if no more elements
        if (!data.hasMoreElements && elements.nextTestContainer) {
          elements.nextTestContainer.style.display = "none"
        }

        // Show promo message instead of upgrade banner
        if (data.upgradeRequired && elements.upgradeBanner) {
          showPromotionalBanner()
        }
      } else {
        showError(`Error: ${data.error || "Unknown error occurred"}`)

        // Show promo message instead of upgrade banner
        if (data.upgradeRequired && elements.upgradeBanner) {
          showPromotionalBanner()
        }
      }
    } catch (error) {
      showError(`Error: ${error.message || "Unknown error occurred"}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Show promotional banner instead of upgrade banner
   */
  function showPromotionalBanner() {
    if (!elements.upgradeBanner) return

    // Replace the upgrade banner with a promotional message
    elements.upgradeBanner.classList.remove("upgrade-banner")
    elements.upgradeBanner.classList.add("promo-banner")

    elements.upgradeBanner.innerHTML = `
      <div class="promo-content">
        <div class="promo-header">
          <span class="promo-icon">🎁</span>
          <h3>Premium Features Unlocked!</h3>
        </div>
        <p>You're enjoying all premium features for free during our launch period. No time limit on your test cases!</p>
        <p class="promo-small">Premium features include unlimited test cases, all export formats, and enhanced detection.</p>
      </div>
    `

    // Show the banner
    elements.upgradeBanner.classList.remove("hidden")
  }

  /**
   * Handle upgrade button click
   */
  async function handleUpgrade() {
    const selectedPlan = document.querySelector(".plan-option.selected")
    if (!selectedPlan || !elements.confirmUpgrade) return

    const planType = selectedPlan.getAttribute("data-plan")
    if (!planType) return

    if (planType === "enterprise") {
      window.open("mailto:sales@example.com?subject=Enterprise Plan Inquiry", "_blank")
      if (elements.upgradeModal) {
        elements.upgradeModal.style.display = "none"
      }
      return
    }

    // Track conversion event
    trackEvent("upgrade_confirmed", "conversion", planType)

    // Show loading state in the button
    elements.confirmUpgrade.textContent = "Processing..."
    elements.confirmUpgrade.disabled = true

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planType }),
      })

      const session = await response.json()

      if (session.success && session.id) {
        // In a real implementation, you would redirect to Stripe checkout
        // For this demo, we'll simulate a successful upgrade
        simulateSuccessfulUpgrade(planType)
      } else {
        throw new Error(session.error || "Failed to create checkout session")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Payment processing error: " + (error.message || "Unknown error"))

      // Reset button
      elements.confirmUpgrade.textContent = "Upgrade Now"
      elements.confirmUpgrade.disabled = false
    }
  }

  /**
   * Simulate a successful upgrade (for demo purposes)
   * @param {String} planType - The plan type
   */
  function simulateSuccessfulUpgrade(planType) {
    if (!elements.output) return

    // Update user plan
    state.userPlan = planType
    localStorage.setItem("userPlan", planType)

    // Hide upgrade elements
    if (elements.upgradeBanner) {
      elements.upgradeBanner.classList.add("hidden")
    }
    if (elements.upgradeModal) {
      elements.upgradeModal.style.display = "none"
    }

    // Enable premium formats
    if (elements.formatSelect) {
      const formatSelect = elements.formatSelect
      for (let i = 0; i < formatSelect.options.length; i++) {
        formatSelect.options[i].disabled = false

        // Remove Pro label
        const option = formatSelect.options[i]
        option.textContent = option.textContent.replace(" (Pro)", "")
      }
    }

    // Show success message
    const successMessage = document.createElement("div")
    successMessage.className = "upgrade-success-banner"
    successMessage.innerHTML = `
      <p>🎉 Congratulations! You've successfully upgraded to the ${planType.charAt(0).toUpperCase() + planType.slice(1)} plan.</p>
      <p>You now have access to all premium features!</p>
    `

    const container = document.querySelector(".container")
    if (container) {
      container.insertBefore(successMessage, elements.output.parentNode)
    } else {
      document.body.insertBefore(successMessage, elements.output.parentNode)
    }

    // Enable "Generate Next Test" button if it was hidden
    if (elements.nextTestContainer && state.hasMoreElements) {
      elements.nextTestContainer.style.display = "block"
    }

    // Remove success message after 5 seconds
    setTimeout(() => {
      if (successMessage.parentNode) {
        successMessage.parentNode.removeChild(successMessage)
      }
    }, 5000)
  }

  /**
   * Render test cases in the output area
   * @param {Array} testCases - Test cases to render
   * @param {Boolean} append - Whether to append or replace existing content
   */
  function renderTestCases(testCases, append = false) {
    if (!testCases || testCases.length === 0 || !elements.output) return

    // Create or get test case list container

