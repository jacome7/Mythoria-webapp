import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function Header() {
  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow">
            <li><Link href="/">Home</Link></li>
            <SignedIn>
              <li><Link href="/dashboard">Dashboard</Link></li>
            </SignedIn>
          </ul>
        </div>
        <Link href="/" className="btn btn-ghost text-xl">Mythoria</Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link href="/">Home</Link></li>
          <SignedIn>
            <li><Link href="/dashboard">Dashboard</Link></li>
          </SignedIn>
        </ul>
      </div>
      <div className="navbar-end">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="btn btn-outline btn-primary">Sign In</button>
          </SignInButton>
        </SignedOut>
        
        <SignedIn>
          <UserButton 
            appearance={{
              elements: {
                userButtonAvatarBox: "w-8 h-8",
              },
            }}
          />
        </SignedIn>
      </div>
    </div>
  );
}