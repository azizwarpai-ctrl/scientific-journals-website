"use client"

// helper to wait
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface ScanResult {
  inputs: HTMLInputElement[]
  selects: HTMLSelectElement[]
  textareas: HTMLTextAreaElement[]
  buttons: HTMLButtonElement[]
}

export const scanPage = (): ScanResult => {
  if (typeof document === "undefined")
    return { inputs: [], selects: [], textareas: [], buttons: [] }

  const inputs = Array.from(document.querySelectorAll("input"))
  const selects = Array.from(document.querySelectorAll("select"))
  const textareas = Array.from(document.querySelectorAll("textarea"))
  const buttons = Array.from(document.querySelectorAll("button"))

  return { inputs: filterHidden(inputs), selects, textareas, buttons }
}

const filterHidden = (elements: any[]) => {
  return elements.filter((el) => {
    return el.type !== "hidden" && el.style.display !== "none"
  })
}

export const generateMockData = (
  type: string,
  name: string,
  isFuzz = false,
) => {
  if (isFuzz) {
    return "FUZZ_TEST_" + Math.random().toString(36).substring(7).repeat(5) + "!@#$%"
  }

  const lowerName = name.toLowerCase()

  if (type === "email" || lowerName.includes("email")) {
    return `test-${Math.floor(Math.random() * 1000)}@example.com`
  }
  if (type === "password" || lowerName.includes("password")) {
    return "TestPassword123!"
  }
  if (type === "number" || lowerName.includes("price") || lowerName.includes("count")) {
    return Math.floor(Math.random() * 100).toString()
  }
  if (type === "date" || lowerName.includes("date")) {
    return new Date().toISOString().split("T")[0]
  }
  if (type === "tel" || lowerName.includes("phone")) {
    return "1234567890"
  }
  if (lowerName.includes("url")) {
    return "https://example.com"
  }

  return `Test Content ${Math.floor(Math.random() * 1000)}`
}

// React 18 / Next.js compatible event simulator
export const simulateInteraction = async (
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) => {
  // Focus
  element.focus()
  await wait(50)

  // Set value directly via prototype to bypass React overrides
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set
  const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value",
  )?.set

  if (element instanceof HTMLInputElement && nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value)
  } else if (
    element instanceof HTMLTextAreaElement &&
    nativeTextareaValueSetter
  ) {
    nativeTextareaValueSetter.call(element, value)
  } else if (
    element instanceof HTMLSelectElement &&
    nativeSelectValueSetter
  ) {
    nativeSelectValueSetter.call(element, value)
  } else {
    element.value = value
  }

  // Dispatch events
  const inputEvent = new Event("input", { bubbles: true })
  element.dispatchEvent(inputEvent)

  const changeEvent = new Event("change", { bubbles: true })
  element.dispatchEvent(changeEvent)

  // Blur
  await wait(50)
  element.blur()
}
