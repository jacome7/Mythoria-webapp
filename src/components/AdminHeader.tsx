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
        {/* Empty for now, can add admin navigation items later */}
      </div>

      <div className="navbar-end">
        <UserButton />
      </div>
    </header>
  );
}
