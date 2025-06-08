import { requireAuth } from "../../lib/auth"
import { Header } from "../components/header"
import { Footer } from "../components/footer"
import Image from "next/image"

export default async function Profile() {
  const session = await requireAuth()
  const user = session.user

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">Profile</h1>
            <p className="text-lg text-base-content/70">
              Manage your account information
            </p>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center gap-6 mb-6">
                <div className="avatar">
                  <div className="w-24 rounded-full">
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt={user.name || "User"}
                        width={96}
                        height={96}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="bg-neutral text-neutral-content rounded-full w-24 h-24 flex items-center justify-center">
                        <span className="text-2xl">
                          {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{user?.name || "Anonymous"}</h2>
                  <p className="text-base-content/70">{user?.email}</p>
                </div>
              </div>

              <div className="divider"></div>

              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="input input-bordered w-full"
                    defaultValue={user?.name || ""}
                    disabled
                  />
                  <label className="label">
                    <span className="label-text-alt">This is pulled from your OAuth provider</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Your email"
                    className="input input-bordered w-full"
                    defaultValue={user?.email || ""}
                    disabled
                  />
                  <label className="label">
                    <span className="label-text-alt">This is pulled from your OAuth provider</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Account Type</span>
                  </label>
                  <div className="badge badge-primary">Free Account</div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Member Since</span>
                  </label>
                  <p className="text-base-content/70">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="divider"></div>

              <div className="card-actions justify-between">
                <button className="btn btn-ghost">
                  Delete Account
                </button>
                <div className="space-x-2">
                  <button className="btn btn-outline">
                    Cancel
                  </button>
                  <button className="btn btn-primary" disabled>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
