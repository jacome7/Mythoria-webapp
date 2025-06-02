'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserButton } from '@clerk/nextjs';

export default function AdminHeader() {
  return (
    <header className="navbar bg-base-100 shadow-md">
      <div className="navbar-start">
        <Link href="/portaldegestao" className="btn btn-ghost normal-case text-xl px-2 py-1">
          <Image 
            src="/Mythoria-logo-white-transparent-256x168.png" 
            alt="Mythoria Logo" 
            width={52} 
            height={34} 
          />
        </Link>
      </div>
        <div className="navbar-center">
        <ul className="menu menu-horizontal px-1">
          <li><Link href="/portaldegestao">Dashboard</Link></li>
          <li><Link href="/portaldegestao/users">Users</Link></li>
          <li><Link href="/portaldegestao/stories">Stories</Link></li>
          <li><Link href="/portaldegestao/payments">Payments</Link></li>
          <li><Link href="/portaldegestao/pricing">Pricing</Link></li>
        </ul>
      </div>

      <div className="navbar-end">
        <UserButton />
      </div>
    </header>
  );
}
