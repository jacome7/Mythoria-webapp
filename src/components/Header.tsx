import Link from 'next/link';
import Image from 'next/image';
import { SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

const Header = () => {
  return (
    <header className="navbar bg-base-100 shadow-md">
      <div className="navbar-start">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </label>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><Link href="/">Homepage</Link></li>
            <li><Link href="/get-inspired">Get Inspired</Link></li>
            <li><Link href="/tell-your-story">Tell Your Story</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
          </ul>
        </div>
        <Link href="/" className="btn btn-ghost normal-case text-xl px-2 py-1">
          <Image src="/Logo_black_transparent_256x222.png" alt="Mythoria Logo" width={46} height={40} /> {/* Adjusted size for navbar */}
        </Link>
      </div><div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link href="/">Homepage</Link></li>
          <li><Link href="/get-inspired">Get Inspired</Link></li>
          <li><Link href="/tell-your-story">Tell Your Story</Link></li>
          <li><Link href="/pricing">Pricing</Link></li>
        </ul>
      </div><div className="navbar-end">
        <SignedOut>
          <SignUpButton mode="modal">
            <button className="btn btn-primary">Signup</button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </header>
  );
};

export default Header;
