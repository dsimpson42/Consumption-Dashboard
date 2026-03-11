import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
  )

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })

  return google.gmail({ version: 'v1', auth: oauth2Client })
}

function decodeBase64(encoded: string): string {
  return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function extractBody(payload: {
  mimeType?: string;
  body?: { data?: string };
  parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: unknown[] }>;
}): string {
  if (!payload) return ''

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64(payload.body.data)
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data)
      }
    }
    // Fall back to first part with data
    for (const part of payload.parts) {
      if (part.body?.data) {
        return decodeBase64(part.body.data)
      }
    }
  }

  return ''
}

function getHeader(
  headers: Array<{ name?: string | null; value?: string | null }>,
  name: string
): string {
  return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export async function GET() {
  const missingVars = []
  if (!process.env.ANTHROPIC_API_KEY) missingVars.push('ANTHROPIC_API_KEY')
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID')
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET')
  if (!process.env.GOOGLE_REFRESH_TOKEN) missingVars.push('GOOGLE_REFRESH_TOKEN')

  if (missingVars.length > 0) {
    return NextResponse.json(
      {
        error: `Missing required environment variables: ${missingVars.join(', ')}. ` +
          'Please configure these in your .env.local file.'
      },
      { status: 500 }
    )
  }

  try {
    const gmail = getGmailClient()

    // Fetch last 5 emails from inbox
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
      labelIds: ['INBOX'],
    })

    const messages = listResponse.data.messages ?? []

    if (messages.length === 0) {
      return NextResponse.json({ emails: [] })
    }

    // Fetch full details for each email
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full',
        })

        const payload = detail.data.payload
        const headers = payload?.headers ?? []

        const subject = getHeader(headers, 'subject') || '(No subject)'
        const from = getHeader(headers, 'from') || 'Unknown sender'
        const date = getHeader(headers, 'date') || ''
        const body = extractBody(payload as Parameters<typeof extractBody>[0])

        return { subject, from, date, body: body.slice(0, 2000) }
      })
    )

    // Build prompt for Claude
    const emailsText = emailDetails
      .map(
        (e, i) =>
          `--- Email ${i + 1} ---\nFrom: ${e.from}\nDate: ${e.date}\nSubject: ${e.subject}\n\nBody:\n${e.body || '(empty body)'}`
      )
      .join('\n\n')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Please summarize the following ${emailDetails.length} emails. For each email, provide:
1. A brief one-line summary of what the email is about
2. Any action items or important dates mentioned
3. The overall tone/urgency (informational, urgent, follow-up needed, etc.)

Keep each summary concise (2-4 sentences). Format each summary clearly with the email number.

${emailsText}`,
        },
      ],
    })

    const summaryText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse Claude's response into per-email summaries
    const summaryBlocks = summaryText.split(/(?=---\s*Email\s+\d+\s*---|\*\*Email\s+\d+|Email\s+\d+:)/i)
    const cleanedBlocks = summaryBlocks
      .map(block => block.trim())
      .filter(block => block.length > 0)

    const emailsWithSummaries = emailDetails.map((email, i) => {
      const summary =
        cleanedBlocks[i] ??
        (summaryText.includes('\n\n')
          ? summaryText.split('\n\n')[i]
          : summaryText)

      return {
        index: i + 1,
        subject: email.subject,
        from: email.from,
        date: email.date,
        summary: summary?.trim() || 'Summary not available.',
      }
    })

    return NextResponse.json({ emails: emailsWithSummaries, rawSummary: summaryText })
  } catch (error) {
    console.error('Error fetching/summarizing emails:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch or summarize emails: ${message}` },
      { status: 500 }
    )
  }
}
