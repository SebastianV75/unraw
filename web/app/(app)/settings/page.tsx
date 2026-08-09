"use client"

import { FormEvent, useEffect, useState } from "react"
import type { OpenRouterSettings } from "@/types"

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("openai/gpt-4.1-nano")
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetch("/api/settings/openrouter")
      .then(async (response) => {
        const body = await response.json() as OpenRouterSettings & { error?: string }
        if (!response.ok) throw new Error(body.error || "Settings could not be loaded.")
        setConfigured(body.configured); setModel(body.model)
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Settings could not be loaded."))
      .finally(() => setLoading(false))
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("")
    try {
      const response = await fetch("/api/settings/openrouter", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: apiKey || undefined, model }) })
      const body = await response.json() as OpenRouterSettings & { error?: string }
      if (!response.ok) throw new Error(body.error || "Settings could not be saved.")
      setConfigured(true); setApiKey(""); setSuccess("OpenRouter settings saved.")
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Settings could not be saved.") }
    setSaving(false)
  }

  async function disconnect() {
    setSaving(true); setError(""); setSuccess("")
    try {
      const response = await fetch("/api/settings/openrouter", { method: "DELETE" })
      const body = await response.json() as { error?: string }
      if (!response.ok) throw new Error(body.error || "OpenRouter could not be disconnected.")
      setConfigured(false); setApiKey(""); setModel("openai/gpt-4.1-nano"); setSuccess("OpenRouter disconnected.")
    } catch (caught) { setError(caught instanceof Error ? caught.message : "OpenRouter could not be disconnected.") }
    setSaving(false)
  }

  return <div className="mx-auto max-w-3xl space-y-8">
    <header><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Account</p><h1 className="mt-2 text-4xl font-bold">Settings</h1><p className="mt-2 text-base-content/70">Connect your OpenRouter API key to use your own account for captures.</p></header>
    {loading && <p>Loading settings...</p>}
    {error && <p className="rounded-box bg-error/10 p-4 text-sm text-error" role="alert">{error}</p>}
    {success && <p className="rounded-box bg-success/10 p-4 text-sm text-success" role="status">{success}</p>}
    {!loading && <form className="space-y-5 rounded-box border border-base-300 bg-base-100 p-6 shadow-sm" onSubmit={save}>
      <div><h2 className="text-xl font-semibold">OpenRouter</h2><p className="mt-1 text-sm text-base-content/70">{configured ? "A key is connected. Enter a new key only if you want to replace it." : "Your key is encrypted before it is stored and is never shown again."}</p></div>
      <label className="form-control"><span className="label-text mb-2 font-semibold">API key</span><input className="input input-bordered w-full" type="password" autoComplete="off" placeholder={configured ? "Leave blank to keep the current key" : "sk-or-..."} value={apiKey} onChange={(event) => setApiKey(event.target.value)} maxLength={500} /></label>
      <label className="form-control"><span className="label-text mb-2 font-semibold">Model</span><input className="input input-bordered w-full" value={model} onChange={(event) => setModel(event.target.value)} maxLength={200} required /></label>
      <div className="flex flex-wrap justify-between gap-3"><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save settings"}</button>{configured && <button className="btn btn-ghost text-error" type="button" onClick={() => void disconnect()} disabled={saving}>Disconnect OpenRouter</button>}</div>
    </form>}
  </div>
}
