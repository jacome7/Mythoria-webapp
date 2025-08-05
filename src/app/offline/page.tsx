import { NextPage } from 'next';

const OfflinePage: NextPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-base-content mb-4">
          You&apos;re Offline
        </h1>
        <p className="text-lg text-base-content/70 mb-6">
          It looks like you&apos;ve lost your internet connection. 
          Don&apos;t worry, you can still browse some of the content you&apos;ve already visited!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => window.history.back()}
            className="btn btn-primary"
          >
            Go Back
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-outline"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage;
