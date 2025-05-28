'use client'; // Required for TypeAnimation

import Image from "next/image";
import Link from "next/link"; // For CTAs if needed
import { TypeAnimation } from 'react-type-animation';
import StoryCounter from "@/components/StoryCounter"; // Added import

export default function Home() {
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
                  sequence={[
                    'Story', 1500,
                    'Adventure', 1500,
                    'Book', 1500,
                    'Novel', 1500,
                    'Memories', 1500,
                  ]}
                  wrapper="span"
                  speed={10}
                  className="text-primary"
                  repeat={Infinity}
                />
                &nbsp;✨
              </h1>
              <p className="py-6 text-lg">
                Craft personalized, AI-powered stories that bring your imagination to life. Perfect for kids, adults, and even your company!
              </p>
              <Link href="/create" className="btn btn-primary btn-lg">
                Try it now
              </Link>
            </div>
            {/* Right Side: Logo */}
            <div className="lg:w-1/2 flex justify-center lg:justify-end mt-8 lg:mt-0">
              <Image 
                src="/Logo_black_512x444.png" 
                alt="Mythoria Logo" 
                width={390} // Adjust size as needed
                height={338} // Adjust size maintaining aspect ratio (512/444 * 300 approx)
                className="rounded-lg"
              />
            </div>
          </div>
        </header>

        {/* Audience Sections */}
        <section className="my-16 grid md:grid-cols-3 gap-8">
          <div className="card bg-base-200 shadow-xl">            <figure className="px-10 pt-10">
              {/* Placeholder for Kids Book Image */}
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
              {/* Placeholder for Adult Book Image */}
              <Image src="/SampleBooks/How_I_met_your_mother.jpg" alt="How I met your mother" width={300} height={300} className="rounded-xl" />
            </figure>
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl">For Adults ❤️</h2>
              <p>Ever felt your life could be a book? Bring your memories and adventures to life in a beautifully illustrated book. Share the story of how you met your significant other or relive unforgettable moments with friends and family.</p>
              <div className="card-actions">
                <Link href="/create?audience=adults" className="btn btn-accent mt-4">Create for Adults</Link>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">            <figure className="px-10 pt-10">
              {/* Placeholder for Company Book Image */}
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
              </div>
              <div className="timeline-start md:text-end mb-10">
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
                <time className="font-mono italic">Step 4</time>
                <div className="text-lg font-black">Pick from over 20 fantastic story settings</div>
                From enchanted castles to exciting space missions, we have adventures suited for every child’s imagination.
              </div>
              <hr/>
            </li>
            <li>
              <hr/>
              <div className="timeline-middle">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              </div>
              <div className="timeline-start md:text-end mb-10">
                <time className="font-mono italic">Step 5</time>
                <div className="text-lg font-black">Fully customize with unique details!</div>
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
          </ul>
          <p className="text-center mt-8 text-lg">
            We’ll take care of everything else, powered by the magic of Artificial Intelligence!
          </p>
        </section>

        <div className="divider my-16"></div>

        {/* Why Mythoria Section */}
        <section className="my-16 hero bg-base-200 rounded-box p-10">
          <div className="hero-content flex-col lg:flex-row-reverse">
            {/* Placeholder Image */}
            <div className="w-48 h-48 bg-primary rounded-full flex items-center justify-center text-primary-content text-4xl mb-6 lg:mb-0 lg:ml-10">💡</div>
            {/* <Image src="/why-mythoria-image.jpg" alt="Child reading" width={400} height={300} className="max-w-sm rounded-lg shadow-2xl" /> */}
            <div>
              <h2 className="text-3xl font-bold mb-4">Why Mythoria?</h2>
              <p className="py-6">
                We believe reading and imagination are essential to a child&apos;s growth and creativity. When children become the heroes of their own stories, they enjoy an unforgettable experience that fosters a lifelong passion for reading and encourages their imagination to soar.
              </p>
            </div>
          </div>
        </section>

        <div className="divider my-16"></div>

        {/* The Perfect Gift Section */}
        <section className="my-16 hero bg-base-200 rounded-box p-10">
          <div className="hero-content flex-col lg:flex-row">
             {/* Placeholder Image */}
            <div className="w-48 h-48 bg-accent rounded-full flex items-center justify-center text-accent-content text-4xl mb-6 lg:mb-0 lg:mr-10">🎁</div>
            {/* <Image src="/gift-image.jpg" alt="Gift" width={400} height={300} className="max-w-sm rounded-lg shadow-2xl" /> */}
            <div>
              <h2 className="text-3xl font-bold mb-4">The Perfect Gift: Personal, Meaningful, and Fun 🎁</h2>
              <p className="py-6">
                A personalized Mythoria book is much more than just a gift—it&apos;s a heartfelt, educational, and joyful keepsake. Ideal for birthdays, special occasions, or just to show you care, these stories become treasured memories that last forever.
              </p>
              <Link href="/create" className="btn btn-accent">Create a Gift</Link>
            </div>
          </div>
        </section>

        <div className="divider my-16"></div>

        {/* Example Books Section */}
        <section className="my-16">
          <h2 className="text-3xl font-bold text-center mb-10">Example Books</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card bg-base-200 shadow-xl">
              <figure className="px-10 pt-10">
                {/* Placeholder Image */}
                <div className="w-full h-56 bg-neutral rounded-lg flex items-center justify-center text-neutral-content">Example Book 1</div>
                {/* <Image src="/example-book-1.jpg" alt="Bea Has a Monkey Up Her Nose!" width={250} height={350} className="rounded-xl" /> */}
              </figure>
              <div className="card-body items-center text-center">
                <p className="italic">Bea Has a Monkey Up Her Nose!</p>
              </div>
            </div>
            <div className="card bg-base-200 shadow-xl">
              <figure className="px-10 pt-10">
                 {/* Placeholder Image */}
                <div className="w-full h-56 bg-neutral rounded-lg flex items-center justify-center text-neutral-content">Example Book 2</div>
                {/* <Image src="/example-book-2.jpg" alt="How I met your mother" width={250} height={350} className="rounded-xl" /> */}
              </figure>
              <div className="card-body items-center text-center">
                <p className="italic">How I met your mother</p>
              </div>
            </div>
            <div className="card bg-base-200 shadow-xl">
              <figure className="px-10 pt-10">
                {/* Placeholder Image */}
                <div className="w-full h-56 bg-neutral rounded-lg flex items-center justify-center text-neutral-content">Example Book 3</div>
                {/* <Image src="/example-book-3.jpg" alt="The story of Google" width={250} height={350} className="rounded-xl" /> */}
              </figure>
              <div className="card-body items-center text-center">
                <p className="italic">The story of Google</p>
              </div>
            </div>
          </div>
        </section>

        <div className="divider my-16"></div>

         {/* Story Counter Section */}
        <section className="my-16 text-center">
          <div className="flex justify-center mb-8">
            <StoryCounter />
          </div>
          <p className="text-xl italic text-accent">
            Every story written is a new world discovered. Start your journey today!
          </p>
        </section>

        <div className="divider my-16"></div>

         {/* Final CTA */}
        <section className="my-16 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Create Magic?</h2>
          <p className="mb-8 text-lg max-w-2xl mx-auto">
            Start crafting a unique, personalized story today and give a gift that will be cherished for a lifetime.
          </p>
          <Link href="/create" className="btn btn-primary btn-lg">
            Start Your Story Now ✨
          </Link>
        </section>

      </div>
    </div>
  );
}
