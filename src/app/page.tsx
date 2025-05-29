'use client'; // Required for TypeAnimation

import Image from "next/image";
import Link from "next/link";
import { TypeAnimation } from 'react-type-animation';
import StoryCounter from "@/components/StoryCounter";
import QuoteOfTheDay from "@/components/QuoteOfTheDay";
import EmailSignup from "@/components/EmailSignup";

export default function Home() {
  // Define the words array
  const words = [
    'Story', 'Adventure', 'Book', 'Romance', 'Novel', 'Memories', 
    'Manuscript', 'Chronicle', 'Tale', 'Fiction', 'Myth', 'Fable', 
    'Odyssey', 'Prose'
  ];

  // Function to shuffle array using Fisher-Yates algorithm
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Create randomized sequence for TypeAnimation
  const createRandomSequence = () => {
    const shuffledWords = shuffleArray(words);
    const sequence: (string | number)[] = [];
    shuffledWords.forEach(word => {
      sequence.push(word, 1500);
    });
    return sequence;
  };

  const showSoonPage = process.env.NEXT_PUBLIC_SHOW_SOON_PAGE === 'true';

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="container mx-auto px-4 py-8">
        {/* Updated Hero Section */}
        <header className="hero min-h-[60vh] bg-base-200 rounded-box my-12">
          <div className="hero-content flex-col lg:flex-row w-full">
            {/* Left Side: Animated Headline and CTA */}
            <div className="lg:w-1/2 text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl font-bold">
                ✨ Write Your Own<br/>
                <TypeAnimation
                  sequence={createRandomSequence()}
                  wrapper="span"
                  speed={10}
                  className="text-primary"
                  repeat={Infinity}
                />
                &nbsp;✨
              </h1>
              <p className="py-6 text-lg">
                Craft personalized, AI-powered stories that bring your imagination to life. Perfect for kids, adults, and even your company!
              </p>{/*}
              <Link href="/create" className="btn btn-primary btn-lg">
                Try it now
              </Link>*/}
            </div>
            {/* Right Side: Logo */}
            <div className="lg:w-1/2 flex justify-center lg:justify-end mt-8 lg:mt-0">
              <Image 
                src="/Logo_black_512x444.png" 
                alt="Mythoria Logo" 
                width={390}
                height={338}
                className="rounded-lg"
              />
            </div>
          </div>
        </header>

        {/* Quote of the Day Section */}
        <section className="my-16">
          <QuoteOfTheDay />
        </section>        {showSoonPage ? (
          <section className="my-16 text-center">
            <h2 className="text-3xl font-bold mb-4">Our story is just beginning...</h2>            
            <p className="text-xl text-gray-600 mb-12">
              Mythoria is brewing something magical! We&apos;re working hard to bring you a new world of AI-powered storytelling.
              Stay tuned, the adventure will be available soon! 🧙‍♂️📚✨
            </p>
            
            {/* Email Signup Component */}
            <div className="max-w-md mx-auto">
              <EmailSignup />
            </div>
          </section>
        ) : (
          <>
            {/* Audience Sections */}
            <section className="my-16 grid md:grid-cols-3 gap-8">
              <div className="card bg-base-200 shadow-xl">
                <figure className="px-10 pt-10">
                  <Image src="/SampleBooks/A_bea_tem_um_macaco_no_nariz.jpg" alt="Kids Book" width={300} height={200} className="rounded-xl" />
                </figure>
                <div className="card-body items-center text-center">
                  <h2 className="card-title text-2xl">For Kids 🎈</h2>
                  <p>Turn your child, grandchild, niece, or nephew into the hero of their very own magical adventure!</p>
                  <div className="card-actions">
                    <Link href="/create?audience=kids" className="btn btn-primary mt-4">Create for Kids</Link>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 shadow-xl">
                <figure className="px-10 pt-10">
                  <Image src="/SampleBooks/How_I_met_your_mother.jpg" alt="How I met your mother" width={300} height={300} className="rounded-xl" />
                </figure>                <div className="card-body items-center text-center">
                  <h2 className="card-title text-2xl">For Adults ❤️</h2>
                  <p>Ever felt your life could be a book? Bring your memories and adventures to life in a beautifully illustrated book. Share the story of how you met your significant other or relive unforgettable moments with friends and family.</p>
                  <div className="card-actions">
                    <Link href="/create?audience=adults" className="btn btn-accent mt-4">Create for Adults</Link>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 shadow-xl">
                <figure className="px-10 pt-10">
                  <Image src="/SampleBooks/CentralCasa.jpg" alt="Company Book" width={300} height={200} className="rounded-xl" />
                </figure>
                <div className="card-body items-center text-center">
                  <h2 className="card-title text-2xl">For Companies 🌟</h2>
                  <p>Delight the children of your employees with personalized storybooks that uniquely highlight your brand.</p>
                  <div className="card-actions">
                    <Link href="/contact?reason=company" className="btn btn-info mt-4">Contact Us</Link>
                  </div>
                </div>
              </div>
            </section>

            <div className="divider my-16"></div>

            {/* How It Works Section */}
            <section className="my-16">
              <h2 className="text-3xl font-bold text-center mb-10">With Mythoria, creating your own story is easy:</h2>
              <ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical">
                <li>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="timeline-start md:text-end mb-10">
                    <time className="font-mono italic">Step 1</time>
                    <div className="text-lg font-black">Choose your character(s)</div>
                    Select your children, grandchildren, or any special young person in your life.
                  </div>
                  <hr/>
                </li>
                <li>
                  <hr/>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="timeline-end mb-10">
                    <time className="font-mono italic">Step 2</time>
                    <div className="text-lg font-black">Tell us about their passions and superpowers</div>
                    What makes them special? Highlight their unique talents or interests!
                  </div>
                  <hr/>
                </li>
                <li>
                  <hr/>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>                  <div className="timeline-start md:text-end mb-10">
                    <time className="font-mono italic">Step 3</time>
                    <div className="text-lg font-black">Optional: Upload a photo</div>
                    Or simply describe the characters, and we&apos;ll handle the rest.
                  </div>
                  <hr/>
                </li>
                <li>
                  <hr/>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="timeline-end mb-10">
                    <time className="font-mono italic">Step 4</time>                    <div className="text-lg font-black">Pick from over 20 fantastic story settings</div>
                    From enchanted castles to exciting space missions, we have adventures suited for every child&apos;s imagination.
                  </div>
                  <hr/>
                </li>
                <li>
                  <hr/>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="timeline-start md:text-end mb-10">
                    <time className="font-mono italic">Step 5</time>                    <div className="text-lg font-black">Fully customize with unique details!</div>
                    Write or simply speak about all the little details you&apos;d like included. Even include specific products, services, or meaningful family traditions.
                  </div>
                  <hr/>
                </li>
                <li>
                  <hr/>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="timeline-end mb-10">
                    <time className="font-mono italic">Step 6</time>
                    <div className="text-lg font-black">Choose your gift format</div>
                    Receive your personalized story as a beautiful hardcover book, a digital ebook, or an engaging audiobook.
                  </div>
                </li>
              </ul>              <p className="text-center mt-8 text-lg">
                We&apos;ll take care of everything else, powered by the magic of Artificial Intelligence!
              </p>
            </section>

            {/* Story Counter Section */}
            <section className="my-16 text-center">
              <h2 className="text-3xl font-bold mb-4">Join Our Growing Community of Storytellers!</h2>
              <StoryCounter />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
