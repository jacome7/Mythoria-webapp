import { NextIntlClientProvider } from 'next-intl';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function RootNotFound() {
  // Default to English for global 404
  const locale = 'en-US';

  return (
    <NextIntlClientProvider 
      locale={locale} 
      messages={{
        common: {
          Header: {
            navigation: {
              homepage: "Homepage",
              getInspired: "Get Inspired",
              tellYourStory: "Tell Your Story",
              myStories: "My Stories",
              pricing: "Pricing",
              dashboard: "Dashboard"
            },
            auth: {
              signIn: "Sign In",
              signUp: "Sign Up"
            },
            logoAlt: "Mythoria Logo"
          },
          Footer: {
            aboutFounder: "My name is Rodrigo, I've just turned 18 years old and I love listening to stories since I was little.",
            readMyStory: "Read my own story",
            privacyPolicy: "Privacy & Cookies",
            termsConditions: "Terms & Conditions",
            contactUs: "Contact Us",
            copyright: "Aventuras Contemporâneas, Lda"
          },
          NotFound: {
            title: "404 - Page Lost in the Enchanted Forest",
            mainHeading: "Oops! This Page is Lost in the Storybook",
            description: "It seems the page you're looking for has wandered off into an unwritten chapter! Maybe it's hiding in a fairy tale, or perhaps it got caught up in an adventure of its own.",
            funnyMessage: "Our literary elves are searching through every book in the magical library, but this page seems to have gone on its own quest!",
            actions: {
              goHome: "Return to Homepage",
              createStory: "Create a New Story"
            },
            quote: "\"Not all those who wander are lost... but this page definitely is!\" - A confused Hobbit"
          }
        }
      }}
    >
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <div className="min-h-screen bg-base-100 text-base-content">
            <div className="container mx-auto px-4 py-8">
              {/* Hero Section */}
              <div className="hero min-h-[60vh] bg-base-200 rounded-box my-12">
                <div className="hero-content flex-col lg:flex-row-reverse max-w-6xl w-full">
                  {/* Illustration */}
                  <div className="lg:w-1/2 text-center">
                    <div className="text-9xl mb-4">📚</div>
                    <div className="text-6xl mb-4">🔍</div>
                    <div className="text-4xl">❓</div>
                  </div>
                  
                  {/* Content */}
                  <div className="lg:w-1/2 text-center lg:text-left">
                    <h1 className="text-5xl font-bold text-primary mb-6">
                      Oops! This Page is Lost in the Storybook
                    </h1>
                    <p className="py-4 text-lg">
                      It seems the page you&apos;re looking for has wandered off into an unwritten chapter! Maybe it&apos;s hiding in a fairy tale, or perhaps it got caught up in an adventure of its own.
                    </p>
                    <p className="py-2 text-base italic">
                      Our literary elves are searching through every book in the magical library, but this page seems to have gone on its own quest!
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="text-center my-12">
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/en-US" className="btn btn-primary btn-lg">
                    🏠 Return to Homepage
                  </Link>
                  <Link href="/en-US/tell-your-story" className="btn btn-secondary btn-lg">
                    ✨ Create a New Story
                  </Link>
                </div>
              </div>

              {/* Funny Quote */}
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-box p-8 my-8">
                <blockquote className="text-center">
                  <p className="text-lg italic mb-4">
                    &quot;Not all those who wander are lost... but this page definitely is!&quot; - A confused Hobbit
                  </p>
                </blockquote>
              </div>

              {/* Animated Elements */}
              <div className="text-center my-8">
                <div className="inline-flex gap-2 text-4xl animate-bounce">
                  🧙‍♂️📖✨🗺️🎭
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
