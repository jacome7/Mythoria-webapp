import Link from 'next/link';
import Image from 'next/image'; // Added Image import
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-base-200 text-base-content p-10">
      <div className="container mx-auto">
        {/* Main footer content with left and right sections */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8">
          <div className="mb-6 md:mb-0">
            <div className="max-w-sm">
              <p className="text-xs text-left mb-2">
                Hello! My name is Rodrigo, I am almost 18 years old and I love listening to stories since I was little.
              </p>
              <Link href="/aboutUs" className="link link-hover text-xs">Read my own story</Link>
            </div>
          </div>

          {/* Right section - Social icons and links */}
          <div className="flex flex-col items-end">
            {/* Social icons */}
            <div className="mb-4">
              <div className="flex gap-4">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="link link-hover">
                  <FaFacebook size={24} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="link link-hover">
                  <FaInstagram size={24} />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="link link-hover">
                  <FaLinkedin size={24} />
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="link link-hover">
                  <FaTiktok size={24} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="link link-hover">
                  <FaYoutube size={24} />
                </a>
              </div>
            </div>
            {/* Links */}
            <div className="flex flex-col items-end gap-2">
              <Link href="/privacy-policy" className="link link-hover text-sm">Privacy Policy</Link>
              <Link href="/faq" className="link link-hover text-sm">FAQ</Link>
            </div>
          </div>
        </div>
        {/* Copyright at the bottom */}
        <div className="border-t border-base-300 pt-4 text-center text-xs">
          <p className="text-xs">&copy; {currentYear} Aventuras Contemporâneas, Lda - All rights reserved</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
