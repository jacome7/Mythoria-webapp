import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function SignInPage() {
  return (
    <div className="min-h-screen hero bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold">Welcome Back!</h1>
          <p className="py-6">
            Sign in to continue your epic adventures in Mythoria. Your stories are waiting for you.
          </p>
        </div>
        <div className="card bg-base-100 w-full max-w-sm shadow-2xl">
          <div className="card-body">
            <div className="text-center mb-6">
              <Image
                src="/Logo_black_transparent_256x222.png"
                alt="Mythoria"
                className="mx-auto h-12 w-auto"
                width={256}
                height={222}
                priority
              />
              <h2 className="text-2xl font-bold mt-4">Sign In</h2>
            </div>
            <SignIn 
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-transparent shadow-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}