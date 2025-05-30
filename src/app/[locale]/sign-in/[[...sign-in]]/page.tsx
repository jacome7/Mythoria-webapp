import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex">
      {/* Left side - Logo and branding (only on desktop) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <Image 
              src="/Logo_black_transparent_256x222.png" 
              alt="Mythoria Logo" 
              width={200} 
              height={174}
              className="drop-shadow-lg"
            />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-800">
              Welcome Back to Mythoria
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Continue your storytelling journey. Sign in to access your magical stories and characters.
            </p>
          </div>
          <div className="space-y-2 text-sm text-gray-500">
            <p>✨ Create unlimited stories</p>
            <p>📚 Manage your character library</p>
            <p>🎨 Customize your adventures</p>
          </div>
        </div>
      </div>

      {/* Right side - Sign-in form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-orange-100">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <Image 
                src="/Logo_black_transparent_256x222.png" 
                alt="Mythoria Logo" 
                width={80} 
                height={70}
              />
            </div>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Sign In
              </h2>
              <p className="text-gray-600">
                Enter your credentials to continue your story
              </p>
            </div>

            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 
                    "bg-orange-600 hover:bg-orange-700 text-sm normal-case font-medium",
                  card: "bg-transparent shadow-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: 
                    "bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium",
                  socialButtonsBlockButtonText: "font-medium",
                  formFieldInput: 
                    "border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-500",
                  footerActionLink: "text-orange-600 hover:text-orange-700",
                  dividerLine: "bg-gray-200",
                  dividerText: "text-gray-500"
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
