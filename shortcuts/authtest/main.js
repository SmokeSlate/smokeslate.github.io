import { startAuthentication, startRegistration } from "@simplewebauthn/browser"

const signupButton = document.querySelector("[data-signup]")
const loginButton = document.querySelector("[data-login]")
const emailInput = document.querySelector("[data-email]")
const modal = document.querySelector("[data-modal]")
const closeButton = document.querySelector("[data-close]")
const SERVER_URL = "http://localhost:3000"
let busy = false

signupButton.addEventListener("click", signup)
loginButton.addEventListener("click", login)
closeButton.addEventListener("click", () => modal.close())

async function signup() {
  return authenticate("register", startRegistration, "registered")
}

async function login() {
  return authenticate("auth", startAuthentication, "logged in")
}

async function authenticate(action, ceremony, successLabel) {
  if (busy) return
  busy = true
  signupButton.disabled = loginButton.disabled = true
  try {
    const email = emailInput.value.trim()
    if (!email || !emailInput.checkValidity()) throw new Error("Enter a valid email address.")
    const query = new URLSearchParams({ email })
    const initResponse = await fetch(`${SERVER_URL}/init-${action}?${query}`, { credentials: "include" })
    const options = await initResponse.json()
    if (!initResponse.ok) throw new Error(options.error || `Initialization failed (${initResponse.status}).`)
    const credential = await ceremony(options)
    const verifyResponse = await fetch(`${SERVER_URL}/verify-${action}`, {
      credentials: "include", method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credential),
    })
    const verification = await verifyResponse.json()
    if (!verifyResponse.ok) throw new Error(verification.error || `Verification failed (${verifyResponse.status}).`)
    showModalText(verification.verified === true ? `Successfully ${successLabel} ${email}` : "Verification was not confirmed.")
  } catch (error) {
    showModalText(error?.message || "The passkey operation could not be completed.")
  } finally {
    busy = false
    signupButton.disabled = loginButton.disabled = false
  }
}

function showModalText(text) {
  modal.querySelector("[data-content]").textContent = text
  if (!modal.open) modal.showModal()
}
