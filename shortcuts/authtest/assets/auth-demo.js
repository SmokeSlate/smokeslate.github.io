function d(e) {
  const t = new Uint8Array(e);
  let n = "";
  for (const a of t)
    n += String.fromCharCode(a);
  return btoa(n).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function g(e) {
  const t = e.replace(/-/g, "+").replace(/_/g, "/"), n = (4 - t.length % 4) % 4, i = t.padEnd(t.length + n, "="), a = atob(i), o = new ArrayBuffer(a.length), r = new Uint8Array(o);
  for (let u = 0; u < a.length; u++)
    r[u] = a.charCodeAt(u);
  return o;
}
function A() {
  return (window == null ? void 0 : window.PublicKeyCredential) !== void 0 && typeof window.PublicKeyCredential == "function";
}
function P(e) {
  const { id: t } = e;
  return {
    ...e,
    id: g(t),
    transports: e.transports
  };
}
function C(e) {
  return e === "localhost" || /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(e);
}
class s extends Error {
  constructor({ message: t, code: n, cause: i, name: a }) {
    super(t, { cause: i }), this.name = a ?? i.name, this.code = n;
  }
}
function K({ error: e, options: t }) {
  var i, a;
  const { publicKey: n } = t;
  if (!n)
    throw Error("options was missing required publicKey property");
  if (e.name === "AbortError") {
    if (t.signal instanceof AbortSignal)
      return new s({
        message: "Registration ceremony was sent an abort signal",
        code: "ERROR_CEREMONY_ABORTED",
        cause: e
      });
  } else if (e.name === "ConstraintError") {
    if (((i = n.authenticatorSelection) == null ? void 0 : i.requireResidentKey) === !0)
      return new s({
        message: "Discoverable credentials were required but no available authenticator supported it",
        code: "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT",
        cause: e
      });
    if (((a = n.authenticatorSelection) == null ? void 0 : a.userVerification) === "required")
      return new s({
        message: "User verification was required but no available authenticator supported it",
        code: "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT",
        cause: e
      });
  } else {
    if (e.name === "InvalidStateError")
      return new s({
        message: "The authenticator was previously registered",
        code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED",
        cause: e
      });
    if (e.name === "NotAllowedError")
      return new s({
        message: e.message,
        code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
        cause: e
      });
    if (e.name === "NotSupportedError")
      return n.pubKeyCredParams.filter((r) => r.type === "public-key").length === 0 ? new s({
        message: 'No entry in pubKeyCredParams was of type "public-key"',
        code: "ERROR_MALFORMED_PUBKEYCREDPARAMS",
        cause: e
      }) : new s({
        message: "No available authenticator supported any of the specified pubKeyCredParams algorithms",
        code: "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG",
        cause: e
      });
    if (e.name === "SecurityError") {
      const o = window.location.hostname;
      if (C(o)) {
        if (n.rp.id !== o)
          return new s({
            message: `The RP ID "${n.rp.id}" is invalid for this domain`,
            code: "ERROR_INVALID_RP_ID",
            cause: e
          });
      } else return new s({
        message: `${window.location.hostname} is an invalid domain`,
        code: "ERROR_INVALID_DOMAIN",
        cause: e
      });
    } else if (e.name === "TypeError") {
      if (n.user.id.byteLength < 1 || n.user.id.byteLength > 64)
        return new s({
          message: "User ID was not between 1 and 64 characters",
          code: "ERROR_INVALID_USER_ID_LENGTH",
          cause: e
        });
    } else if (e.name === "UnknownError")
      return new s({
        message: "The authenticator was unable to process the specified options, or could not create a new credential",
        code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
        cause: e
      });
  }
  return e;
}
class v {
  createNewAbortSignal() {
    if (this.controller) {
      const n = new Error("Cancelling existing WebAuthn API call for new one");
      n.name = "AbortError", this.controller.abort(n);
    }
    const t = new AbortController();
    return this.controller = t, t.signal;
  }
  cancelCeremony() {
    if (this.controller) {
      const t = new Error("Manually cancelling existing WebAuthn API call");
      t.name = "AbortError", this.controller.abort(t), this.controller = void 0;
    }
  }
}
const T = new v(), N = ["cross-platform", "platform"];
function O(e) {
  if (e && !(N.indexOf(e) < 0))
    return e;
}
async function U(e) {
  var R;
  if (!A())
    throw new Error("WebAuthn is not supported in this browser");
  const n = { publicKey: {
    ...e,
    challenge: g(e.challenge),
    user: {
      ...e.user,
      id: g(e.user.id)
    },
    excludeCredentials: (R = e.excludeCredentials) == null ? void 0 : R.map(P)
  } };
  n.signal = T.createNewAbortSignal();
  let i;
  try {
    i = await navigator.credentials.create(n);
  } catch (c) {
    throw K({ error: c, options: n });
  }
  if (!i)
    throw new Error("Registration was not completed");
  const { id: a, rawId: o, response: r, type: u } = i;
  let l;
  typeof r.getTransports == "function" && (l = r.getTransports());
  let f;
  if (typeof r.getPublicKeyAlgorithm == "function")
    try {
      f = r.getPublicKeyAlgorithm();
    } catch (c) {
      b("getPublicKeyAlgorithm()", c);
    }
  let h;
  if (typeof r.getPublicKey == "function")
    try {
      const c = r.getPublicKey();
      c !== null && (h = d(c));
    } catch (c) {
      b("getPublicKey()", c);
    }
  let w;
  if (typeof r.getAuthenticatorData == "function")
    try {
      w = d(r.getAuthenticatorData());
    } catch (c) {
      b("getAuthenticatorData()", c);
    }
  return {
    id: a,
    rawId: d(o),
    response: {
      attestationObject: d(r.attestationObject),
      clientDataJSON: d(r.clientDataJSON),
      transports: l,
      publicKeyAlgorithm: f,
      publicKey: h,
      authenticatorData: w
    },
    type: u,
    clientExtensionResults: i.getClientExtensionResults(),
    authenticatorAttachment: O(i.authenticatorAttachment)
  };
}
function b(e, t) {
  console.warn(`The browser extension that intercepted this WebAuthn API call incorrectly implemented ${e}. You should report this error to them.
`, t);
}
function L() {
  if (!A())
    return new Promise((t) => t(!1));
  const e = window.PublicKeyCredential;
  return e.isConditionalMediationAvailable === void 0 ? new Promise((t) => t(!1)) : e.isConditionalMediationAvailable();
}
function $({ error: e, options: t }) {
  const { publicKey: n } = t;
  if (!n)
    throw Error("options was missing required publicKey property");
  if (e.name === "AbortError") {
    if (t.signal instanceof AbortSignal)
      return new s({
        message: "Authentication ceremony was sent an abort signal",
        code: "ERROR_CEREMONY_ABORTED",
        cause: e
      });
  } else {
    if (e.name === "NotAllowedError")
      return new s({
        message: e.message,
        code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
        cause: e
      });
    if (e.name === "SecurityError") {
      const i = window.location.hostname;
      if (C(i)) {
        if (n.rpId !== i)
          return new s({
            message: `The RP ID "${n.rpId}" is invalid for this domain`,
            code: "ERROR_INVALID_RP_ID",
            cause: e
          });
      } else return new s({
        message: `${window.location.hostname} is an invalid domain`,
        code: "ERROR_INVALID_DOMAIN",
        cause: e
      });
    } else if (e.name === "UnknownError")
      return new s({
        message: "The authenticator was unable to process the specified options, or could not create a new assertion signature",
        code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
        cause: e
      });
  }
  return e;
}
async function M(e, t = !1) {
  var w, R;
  if (!A())
    throw new Error("WebAuthn is not supported in this browser");
  let n;
  ((w = e.allowCredentials) == null ? void 0 : w.length) !== 0 && (n = (R = e.allowCredentials) == null ? void 0 : R.map(P));
  const i = {
    ...e,
    challenge: g(e.challenge),
    allowCredentials: n
  }, a = {};
  if (t) {
    if (!await L())
      throw Error("Browser does not support WebAuthn autofill");
    if (document.querySelectorAll("input[autocomplete$='webauthn']").length < 1)
      throw Error('No <input> with "webauthn" as the only or last value in its `autocomplete` attribute was detected');
    a.mediation = "conditional", i.allowCredentials = [];
  }
  a.publicKey = i, a.signal = T.createNewAbortSignal();
  let o;
  try {
    o = await navigator.credentials.get(a);
  } catch (c) {
    throw $({ error: c, options: a });
  }
  if (!o)
    throw new Error("Authentication was not completed");
  const { id: r, rawId: u, response: l, type: f } = o;
  let h;
  return l.userHandle && (h = d(l.userHandle)), {
    id: r,
    rawId: d(u),
    response: {
      authenticatorData: d(l.authenticatorData),
      clientDataJSON: d(l.clientDataJSON),
      signature: d(l.signature),
      userHandle: h
    },
    type: f,
    clientExtensionResults: o.getClientExtensionResults(),
    authenticatorAttachment: O(o.authenticatorAttachment)
  };
}
const m = document.querySelector("[data-signup]"), y = document.querySelector("[data-login]"), _ = document.querySelector("[data-email]"), p = document.querySelector("[data-modal]"), q = document.querySelector("[data-close]"), S = "http://localhost:3000";
let E = !1;
m.addEventListener("click", B);
y.addEventListener("click", H);
q.addEventListener("click", () => p.close());
async function B() {
  return D("register", U, "registered");
}
async function H() {
  return D("auth", M, "logged in");
}
async function D(e, t, n) {
  if (!E) {
    E = !0, m.disabled = y.disabled = !0;
    try {
      const i = _.value.trim();
      if (!i || !_.checkValidity()) throw new Error("Enter a valid email address.");
      const a = new URLSearchParams({ email: i }), o = await fetch(`${S}/init-${e}?${a}`, { credentials: "include" }), r = await o.json();
      if (!o.ok) throw new Error(r.error || `Initialization failed (${o.status}).`);
      const u = await t(r), l = await fetch(`${S}/verify-${e}`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(u)
      }), f = await l.json();
      if (!l.ok) throw new Error(f.error || `Verification failed (${l.status}).`);
      I(f.verified === !0 ? `Successfully ${n} ${i}` : "Verification was not confirmed.");
    } catch (i) {
      I((i == null ? void 0 : i.message) || "The passkey operation could not be completed.");
    } finally {
      E = !1, m.disabled = y.disabled = !1;
    }
  }
}
function I(e) {
  p.querySelector("[data-content]").textContent = e, p.open || p.showModal();
}
