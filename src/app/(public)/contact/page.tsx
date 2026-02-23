'use client'

import { CheckCircle, Clock, Mail, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Button, Input, Card, CardContent, Textarea } from '@/components/ui'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitted(true)
        setFormData({ name: '', email: '', subject: '', message: '' })
      }
    } catch (error) {
      console.error('Contact form error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Contact Us</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Have questions about our cabin or your upcoming stay? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <Card>
            <CardContent className="py-8">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-forest-100 dark:bg-forest-900 text-forest-600 dark:text-forest-400 mb-4">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Message Sent!</h3>
                  <p className="text-muted-foreground mb-4">
                    Thank you for reaching out. We&apos;ll get back to you as soon as possible.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false)
                    }}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
                  <Input
                    label="Your Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                  />
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="john@example.com"
                  />
                  <Input
                    label="Subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="Question about my booking"
                  />
                  <Textarea
                    label="Message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Your message..."
                  />
                  <Button type="submit" isLoading={isSubmitting} className="w-full">
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Get in Touch</h2>
            <p className="text-muted-foreground mb-6">
              Whether you have questions about amenities, directions, or special requests,
              we&apos;re here to help make your stay perfect.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-forest-100 dark:bg-forest-900 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-forest-600 dark:text-forest-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-foreground">Location</h3>
                <p className="text-muted-foreground">Big Bear, CA</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-forest-100 dark:bg-forest-900 flex items-center justify-center">
                <Mail className="w-6 h-6 text-forest-600 dark:text-forest-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-foreground">Email</h3>
                <a
                  href="mailto:questions@grizzlygetaway.co"
                  className="text-forest-600 dark:text-forest-400 hover:underline"
                >
                  questions@grizzlygetaway.co
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-forest-100 dark:bg-forest-900 flex items-center justify-center">
                <Clock className="w-6 h-6 text-forest-600 dark:text-forest-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-foreground">Response Time</h3>
                <p className="text-muted-foreground">We typically respond within 24 hours</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
