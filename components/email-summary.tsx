"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, RefreshCw, AlertCircle } from "lucide-react"

interface EmailSummary {
  index: number
  subject: string
  from: string
  date: string
  summary: string
}

interface EmailsResponse {
  emails?: EmailSummary[]
  rawSummary?: string
  error?: string
}

export default function EmailSummaryPanel() {
  const [emails, setEmails] = useState<EmailSummary[]>([])
  const [rawSummary, setRawSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  const fetchAndSummarize = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/emails')
      const data: EmailsResponse = await response.json()

      if (!response.ok || data.error) {
        setError(data.error ?? 'Failed to fetch emails.')
        setEmails([])
      } else {
        setEmails(data.emails ?? [])
        setRawSummary(data.rawSummary ?? '')
        setFetched(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-gray-800 border-gray-700 mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail size={20} className="text-blue-400" />
            <CardTitle className="text-xl font-bold text-gray-100">Recent Emails</CardTitle>
          </div>
          <Button
            onClick={fetchAndSummarize}
            disabled={loading}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Summarizing...
              </>
            ) : fetched ? (
              <>
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </>
            ) : (
              <>
                <Mail size={16} className="mr-2" />
                Load Last 5 Emails
              </>
            )}
          </Button>
        </div>
        <CardDescription>AI-powered summaries of your last 5 inbox emails</CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="flex items-start space-x-2 p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!fetched && !loading && !error && (
          <p className="text-gray-400 text-sm text-center py-6">
            Click &quot;Load Last 5 Emails&quot; to fetch and summarize your recent inbox messages.
          </p>
        )}

        {loading && (
          <div className="text-center py-8 text-gray-400">
            <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-blue-400" />
            <p className="text-sm">Fetching emails and generating summaries with Claude AI...</p>
          </div>
        )}

        {fetched && !loading && emails.length === 0 && !error && (
          <p className="text-gray-400 text-sm text-center py-6">No emails found in your inbox.</p>
        )}

        {emails.length > 0 && !loading && (
          <div className="space-y-4">
            {emails.map((email) => (
              <div
                key={email.index}
                className="p-4 bg-gray-700 rounded-lg border border-gray-600"
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="font-semibold text-gray-100 text-sm leading-tight">
                    {email.subject}
                  </h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                    #{email.index}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                  <span className="text-xs text-blue-400">{email.from}</span>
                  <span className="text-xs text-gray-400">{email.date}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {email.summary}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
