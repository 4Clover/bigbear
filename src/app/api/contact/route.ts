import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.AUTH_RESEND_KEY)

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

export const POST = async (request: NextRequest) => {
  try {
    const body = (await request.json()) as ContactFormData
    const { name, email, subject, message } = body

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Send email to the owner
    const ownerEmail = process.env.OWNER_EMAIL || process.env.RESEND_FROM_EMAIL

    if (ownerEmail) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
        to: ownerEmail,
        replyTo: email,
        subject: `Contact Form: ${subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      })
    }

    // Send confirmation to the user
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'We received your message - Big Bear Cabin',
      html: `
        <h2>Thank you for reaching out!</h2>
        <p>Hello ${name},</p>
        <p>We received your message and will get back to you as soon as possible.</p>
        <p><strong>Your message:</strong></p>
        <blockquote style="border-left: 3px solid #10b981; padding-left: 16px; margin-left: 0;">
          ${message.replace(/\n/g, '<br>')}
        </blockquote>
        <p>Best regards,<br>Big Bear Cabin Team</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
