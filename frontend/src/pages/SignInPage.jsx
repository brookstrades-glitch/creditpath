import { SignIn } from '@clerk/clerk-react'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="w-12 h-12 bg-primary-700 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span className="text-white font-bold text-lg">CP</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">CreditPath</h1>
        <p className="text-sm text-gray-500 mt-1">Personal Credit Repair Assistant</p>
      </div>

      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
        appearance={{
          elements: {
            rootBox:       'w-full max-w-md',
            card:          'shadow-card border border-gray-100 rounded-2xl',
            headerTitle:   'text-gray-900 font-semibold',
            headerSubtitle:'text-gray-500',
            socialButtonsBlockButton: 'border-gray-200',
            formButtonPrimary: 'bg-primary-700 hover:bg-primary-800',
          }
        }}
      />

      <p className="mt-6 text-xs text-gray-400 text-center max-w-xs">
        This application is not a Credit Repair Organization as defined in 15 U.S.C. § 1679a(3)
        and does not provide legal advice.
      </p>
    </div>
  )
}
