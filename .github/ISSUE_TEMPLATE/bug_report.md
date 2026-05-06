name: Bug Report
description: Create a report to help us improve DormDoc
title: "[BUG] "
labels: ["bug"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
  - type: input
    id: version
    attributes:
      label: DormDoc Version
      description: What version of DormDoc are you running? (e.g., 1.0.0, or commit hash)
      placeholder: "1.0.0"
    validations:
      required: true
  - type: dropdown
    id: environment
    attributes:
      label: Environment
      description: Where did this happen?
      options:
        - Local development
        - Staging
        - Production
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: Description
      description: A clear and concise description of what the bug is.
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior.
      placeholder: |
        1. Go to '...'
        2. Click on '....'
        3. Scroll down to '....'
        4. See error
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: A clear and concise description of what you expected to happen.
    validations:
      required: true
  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots / Logs
      description: If applicable, add screenshots or console logs to help explain your problem.
