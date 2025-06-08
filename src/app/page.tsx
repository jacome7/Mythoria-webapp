const HomePage = () => {
    return (
        <main className="min-h-screen bg-base-100">
            <div className="hero min-h-screen bg-base-200">
                <div className="hero-content text-center">
                    <div className="max-w-md">
                        <h1 className="text-5xl font-bold text-primary">Welcome to Mythoria</h1>
                        <p className="py-6 text-base-content">
                            Experience the magic of Mythoria with beautiful DaisyUI autumn theme components.
                        </p>
                        <button className="btn btn-primary">Get Started</button>
                    </div>
                </div>
            </div>
            
            <div className="container mx-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title text-primary">Autumn Theme</h2>
                            <p>Beautiful warm colors perfect for your fantasy adventure.</p>
                            <div className="card-actions justify-end">
                                <button className="btn btn-secondary">Learn More</button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title text-accent">DaisyUI Components</h2>
                            <p>Rich set of components ready to use out of the box.</p>
                            <div className="card-actions justify-end">
                                <button className="btn btn-accent">Explore</button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title text-info">Modern Design</h2>
                            <p>Clean, accessible, and beautiful user interface design.</p>
                            <div className="card-actions justify-end">
                                <button className="btn btn-info">Discover</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="divider my-8"></div>
                
                <div className="alert alert-success">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>DaisyUI with autumn theme is now active!</span>
                </div>
            </div>
        </main>
    );
};

export default HomePage;