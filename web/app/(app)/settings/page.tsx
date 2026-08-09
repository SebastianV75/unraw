"use client"

import { useEffect, useState } from "react"
import type { OpenRouterSettings } from "@/types"
import { InlineValidation } from "@/components/interior/inline-validation"
import { LoadingButton } from "@/components/interior/loading-button"
import { SkeletonSwap } from "@/components/interior/skeleton-swap"

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

  async function save() {
    if (!model.trim() || (!configured && !apiKey.trim())) {
      setError(configured ? "A model is required." : "An API key and model are required.")
      return
    }
    setSaving(true); setError(""); setSuccess("")
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
     {error && <p className="rounded-box bg-error/10 p-4 text-sm text-error" role="alert">{error}</p>}
     {success && <p className="rounded-box bg-success/10 p-4 text-sm text-success" role="status">{success}</p>}
     <SkeletonSwap ready={!loading} lines={6} reserve={360} label="Settings">
       {!loading ? <form className="space-y-5 rounded-box border border-base-300 bg-base-100 p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); void save() }}>
         <div><h2 className="text-xl font-semibold">OpenRouter</h2><p className="mt-1 text-sm text-base-content/70">{configured ? "A key is connected. Enter a new key only if you want to replace it." : "Your key is encrypted before it is stored and is never shown again."}</p></div>
         <InlineValidation label="API key" type="password" autoComplete="off" placeholder={configured ? "Leave blank to keep the current key" : "sk-or-..."} value={apiKey} onChange={setApiKey} maxLength={500} validate={(value) => configured && !value ? null : value && !value.startsWith("sk-") ? "Use an OpenRouter key starting with sk-." : null} hint="Your key is encrypted before it is stored." />
         <InlineValidation label="Model" value={model} onChange={setModel} maxLength={200} required validate={(value) => value.trim() ? null : "A model is required."} hint="Example: openai/gpt-4.1-nano" />
         <div className="flex flex-wrap justify-between gap-3"><LoadingButton className="btn btn-primary" onAction={save} pendingLabel="Saving..." disabled={saving}>Save settings</LoadingButton>{configured && <LoadingButton className="btn btn-ghost text-error" onAction={disconnect} pendingLabel="Disconnecting..." disabled={saving}>Disconnect OpenRouter</LoadingButton>}</div>
       </form> : null}
     </SkeletonSwap>
  </div>
}
