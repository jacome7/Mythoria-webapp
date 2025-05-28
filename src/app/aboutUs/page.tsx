import React from 'react';
import Image from 'next/image'; // Import Image component

const AboutUsPage = () => {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="grid md:grid-cols-2 gap-12 items-center mb-12 md:mb-16">
        <div className="md:pr-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-100 leading-tight">
            Hello! My name is Rodrigo and I&apos;m almost 18 years old.
          </h1>
        </div>
        <div>
          <Image 
            src="/AboutUs.jpg"
            alt="Rodrigo - Founder of Mythoria"
            width={500} 
            height={500}
            className="rounded-lg shadow-2xl object-cover w-full h-auto md:max-h-[500px]"
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6 text-lg text-gray-300 leading-relaxed">
        <p>
          I grew up fascinated by the adventures my dad invented, stories that fueled my imagination and taught me that each of us can be the hero of incredible adventures.
        </p>
        <p>
          Today, I not only enjoy hearing stories, but I also love creating them. I&apos;m passionate about Artificial Intelligence and discovered that AI could help build fantastic worlds and unforgettable characters. I particularly enjoy crafting stories to tell my younger brother, turning each narrative into a unique and personal experience.
        </p>
        <p>
          When I first used ChatGPT, I was amazed by the potential of this technology. Since then, I&apos;ve been exploring the endless possibilities AI offers to personalize and enhance storytelling.
        </p>
        <p className="font-semibold text-gray-100">
          Could a 17-year-old create an innovative company using only Artificial Intelligence? Driven by this ambition and curiosity, Mythoria was born—a project dedicated to crafting fully personalized books, where every child becomes the hero of their own adventure.
        </p>
        <p className="text-2xl font-bold text-center text-primary mt-10">
          Mythoria is more than just a book: it&apos;s your very own story.
        </p>
      </div>
    </div>
  );
};

export default AboutUsPage;
