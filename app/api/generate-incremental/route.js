return {
    id: `TC_LINK_${index + 1}`,
    title: `Test Link: ${linkText}`,
    description: description,
    priority: "Medium",
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: "Page loads successfully",
      },
      {
        step: 2,
        action: `Locate the link ${linkIdentifier}`,
        expected: "Link is visible on the page",
      },
      {
        step: 3,
        action: `Click the ${linkText} link`,
        expected: expectedResult,
      },
