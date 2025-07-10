'use client';

import { useTranslations } from 'next-intl';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { FaTrash, FaExclamationTriangle, FaUser, FaCog, FaLock } from 'react-icons/fa';

export default function DeleteAccountPage() {
  const t = useTranslations('DeleteAccount');
  const { user, isLoaded } = useUser();
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || emailConfirmation !== user.primaryEmailAddress?.emailAddress) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Redirect to homepage or logout page
        window.location.href = '/';
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('An error occurred while deleting your account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  const isEmailValid = user?.primaryEmailAddress?.emailAddress === emailConfirmation;
  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">
            {t('title')}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {!isLoaded ? (
          <div className="flex justify-center items-center h-32">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        ) : !user ? (
          // Instructions for non-logged users
          <div className="bg-white shadow-xl rounded-lg p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FaUser className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-primary">
                {t('notLoggedIn.title')}
              </h2>
            </div>
            <p className="text-gray-700 mb-6 text-lg">
              {t('notLoggedIn.description')}
            </p>
            
            <div className="bg-base-100 border border-base-300 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <FaCog className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-primary">
                  {t('notLoggedIn.steps.title')}
                </h3>
              </div>
              <ol className="list-decimal list-inside space-y-3 text-gray-700">
                <li className="pl-2">{t('notLoggedIn.steps.step1')}</li>
                <li className="pl-2">{t('notLoggedIn.steps.step2')}</li>
                <li className="flex items-center gap-2 pl-2">
                  <FaLock className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{t('notLoggedIn.steps.step3')}</span>
                </li>
                <li className="pl-2">{t('notLoggedIn.steps.step4')}</li>
              </ol>
            </div>
            
            <div className="alert alert-warning">
              <FaExclamationTriangle className="h-5 w-5" />
              <div>
                <h4 className="font-bold">{t('warning.title')}</h4>
                <div className="text-sm">{t('warning.description')}</div>
              </div>
            </div>
          </div>
        ) : (
          // Delete account form for logged users
          <div className="bg-white shadow-xl rounded-lg p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FaTrash className="h-6 w-6 text-error" />
              <h2 className="text-2xl font-bold text-error">
                {t('loggedIn.title')}
              </h2>
            </div>
            <p className="text-gray-700 mb-8 text-lg">
              {t('loggedIn.description')}
            </p>

            {/* Warning Alert */}
            <div className="alert alert-warning mb-6">
              <FaExclamationTriangle className="h-5 w-5" />
              <div>
                <h4 className="font-bold">{t('warning.title')}</h4>
                <div className="text-sm">{t('warning.description')}</div>
              </div>
            </div>

            {/* Consequences */}
            <div className="alert alert-error mb-8">
              <FaExclamationTriangle className="h-5 w-5" />
              <div className="w-full">
                <h4 className="font-bold mb-3">{t('loggedIn.consequences.title')}</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-current rounded-full mt-2 flex-shrink-0"></span>
                    {t('loggedIn.consequences.item1')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-current rounded-full mt-2 flex-shrink-0"></span>
                    {t('loggedIn.consequences.item2')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-current rounded-full mt-2 flex-shrink-0"></span>
                    {t('loggedIn.consequences.item3')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-current rounded-full mt-2 flex-shrink-0"></span>
                    {t('loggedIn.consequences.item4')}
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setIsDialogOpen(true)}
              className="btn btn-error btn-lg w-full"
            >
              <FaTrash className="h-5 w-5" />
              {t('loggedIn.deleteButton')}
            </button>

            {/* Modal Dialog */}
            {isDialogOpen && (
              <div className="modal modal-open">
                <div className="modal-box">
                  <h3 className="font-bold text-lg text-error mb-4">
                    {t('confirmation.title')}
                  </h3>
                  <p className="text-gray-700 mb-6">
                    {t('confirmation.description')}
                  </p>
                  
                  <div className="form-control mb-6">
                    <label className="label">
                      <span className="label-text font-medium">{t('confirmation.emailLabel')}</span>
                    </label>
                    <input
                      type="email"
                      value={emailConfirmation}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailConfirmation(e.target.value)}
                      placeholder={user.primaryEmailAddress?.emailAddress}
                      className="input input-bordered w-full"
                    />
                    {emailConfirmation && !isEmailValid && (
                      <label className="label">
                        <span className="label-text-alt text-error break-words">
                          {t('confirmation.emailMismatch')}
                        </span>
                      </label>
                    )}
                  </div>
                  
                  <div className="modal-action">
                    <button
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEmailConfirmation('');
                      }}
                      className="btn btn-ghost"
                    >
                      {t('confirmation.cancel')}
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={!isEmailValid || isDeleting}
                      className="btn btn-error"
                    >
                      {isDeleting ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          {t('confirmation.deleting')}
                        </>
                      ) : (
                        <>
                          <FaTrash className="h-4 w-4" />
                          {t('confirmation.confirmDelete')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Legal compliance information */}
        <div className="bg-white shadow-xl rounded-lg p-8">
          <h2 className="text-xl font-bold text-primary mb-4">
            {t('legal.title')}
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {t('legal.description')}
          </p>
        </div>
      </div>
    </div>
  );
}
