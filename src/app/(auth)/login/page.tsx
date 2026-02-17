import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata = {
  title: 'Sign In',
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
